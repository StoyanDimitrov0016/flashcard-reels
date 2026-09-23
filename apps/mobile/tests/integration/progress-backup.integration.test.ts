import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import type { ProgressBackupFileGateway } from "@/features/progress-backup/application/progress-backup-file.gateway";

import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { ProgressBackupServiceImpl } from "@/features/progress-backup/application/progress-backup.service.impl";
import {
  ProgressBackupDocumentSchema,
  type ProgressBackupDocument,
} from "@/features/progress-backup/contracts/progress-backup.schema";
import { SQLiteProgressBackupRestoreTransaction } from "@/features/progress-backup/infrastructure/sqlite-progress-backup-restore.transaction";
import { SQLiteProgressBackupQuery } from "@/features/progress-backup/infrastructure/sqlite-progress-backup.query";
import {
  flashcardReviewAttempts,
  reviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeSession,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "../support/study-fixtures";

class MemoryBackupFiles implements ProgressBackupFileGateway {
  picked: string | null = null;
  shared: ProgressBackupDocument | null = null;
  safetyCopy: ProgressBackupDocument | null = null;

  async pick(): Promise<string | null> {
    return this.picked;
  }
  async share(document: ProgressBackupDocument): Promise<void> {
    this.shared = document;
  }
  async saveSafetyCopy(document: ProgressBackupDocument): Promise<void> {
    this.safetyCopy = document;
  }
  async hasSafetyCopy(): Promise<boolean> {
    return this.safetyCopy !== null;
  }
  async shareSafetyCopy(): Promise<void> {}
}

describe("progress backup", () => {
  const databases: NodeSqliteDatabase[] = [];
  afterEach(() => {
    for (const database of databases) {
      database.close();
    }
    databases.length = 0;
  });

  function createDatabase() {
    const database = new NodeSqliteDatabase();
    databases.push(database);
    return database;
  }

  it("keeps the device import fixture compatible with the backup format", () => {
    const fixture: unknown = JSON.parse(
      readFileSync(".maestro/fixtures/progress-backup.json", "utf8")
    );
    const document = ProgressBackupDocumentSchema.parse(fixture);
    expect(document.reviewEvents).toHaveLength(1);
  });

  it("closes an active session and drains progress beyond the foreground batch limit", async () => {
    const database = createDatabase();
    const cardIds = Array.from({ length: 60 }, (_, index) => testId(index + 1));
    await seedDeck(database, TEST_DECK_ID, cardIds);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const session = makeSession(testId(700), "focused", TEST_DECK_ID, 0, 59);
    await graph.sessions.create(session);
    await database.drizzle.insert(flashcardReviewAttempts).values(
      cardIds.map((flashcardId, reelPosition) => ({
        id: testId(800 + reelPosition),
        studySessionId: session.id,
        flashcardId,
        reelPosition,
        rating: "good" as const,
        ratedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }))
    );
    const files = new MemoryBackupFiles();
    const backup = new ProgressBackupServiceImpl(
      graph.study,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle),
      files,
      clock
    );

    await backup.exportProgress();

    expect(files.shared?.reviewEvents).toHaveLength(60);
    expect(files.shared?.flashcardProgress).toHaveLength(60);
    expect(files.shared?.flashcardMemoryStates).toHaveLength(60);
    expect(files.shared?.flashcardProgress.every((row) => row.reviewCount === 1)).toBe(true);
    const completedSession = await graph.sessions.findById(session.id);
    expect(completedSession?.aggregatedThroughReelPosition).toBe(59);
    expect(completedSession?.completedAt).not.toBeNull();
  });

  it("replaces local progress and activates imported progress when its deck is installed", async () => {
    const source = createDatabase();
    const cardId = testId(1);
    await seedDeck(source, TEST_DECK_ID, [cardId]);
    const sourceClock = new TestClock();
    const sourceGraph = createScenarioGraph(source, sourceClock, new SequenceIdGenerator());
    const session = makeSession(testId(701), "focused", TEST_DECK_ID);
    await sourceGraph.sessions.create(session);
    await source.drizzle.insert(flashcardReviewAttempts).values({
      id: testId(801),
      studySessionId: session.id,
      flashcardId: cardId,
      reelPosition: 0,
      rating: "easy",
      ratedAt: sourceClock.now(),
      createdAt: sourceClock.now(),
      updatedAt: sourceClock.now(),
    });
    await sourceGraph.study.completeSession(session.id);
    await new SQLiteDeckRemovalTransaction(source.drizzle).remove(TEST_DECK_ID);
    const archived = await new SQLiteProgressBackupQuery(source.drizzle).read(sourceClock.now());
    expect(archived.deckProgress[0]?.resolution).toBe("archived");

    const target = createDatabase();
    await seedDeck(target, TEST_DECK_ID, [cardId]);
    const targetClock = new TestClock();
    const targetGraph = createScenarioGraph(target, targetClock, new SequenceIdGenerator());
    await target.drizzle.insert(studySessions).values({
      id: testId(901),
      scope: "focused",
      deckId: TEST_DECK_ID,
      currentReelPosition: 0,
      furthestReelPosition: 0,
      createdAt: sourceClock.now(),
      lastActiveAt: sourceClock.now(),
      feedState: "{}",
    });
    await target.drizzle.insert(flashcardReviewAttempts).values({
      id: testId(900),
      studySessionId: testId(901),
      flashcardId: cardId,
      reelPosition: 0,
      rating: "again",
      ratedAt: targetClock.now(),
      createdAt: targetClock.now(),
      updatedAt: targetClock.now(),
    });
    await targetGraph.study.completeSession(testId(901));
    await target.drizzle.insert(studySessions).values({
      id: testId(902),
      scope: "mixed",
      deckId: null,
      currentReelPosition: 0,
      furthestReelPosition: 0,
      createdAt: targetClock.now(),
      lastActiveAt: targetClock.now(),
      feedState: "{}",
    });
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify(archived);
    const backup = new ProgressBackupServiceImpl(
      targetGraph.study,
      new SQLiteProgressBackupQuery(target.drizzle),
      new SQLiteProgressBackupRestoreTransaction(target.drizzle),
      files,
      targetClock
    );
    const prepared = await backup.prepareRestore();
    expect(prepared?.incoming.reviewCount).toBe(1);
    expect(prepared?.local.reviewCount).toBe(1);
    if (!prepared) {
      throw new Error("Expected a prepared restore");
    }

    await backup.restore(prepared);

    const restored = await new SQLiteProgressBackupQuery(target.drizzle).read(targetClock.now());
    expect(restored.reviewEvents.map((event) => event.id)).toEqual([testId(801)]);
    expect(restored.deckProgress[0]?.resolution).toBe("active");
    expect(restored.flashcardMemoryStates).toHaveLength(1);
    expect(await target.drizzle.select().from(studySessions)).toHaveLength(0);
    expect(files.safetyCopy?.reviewEvents.map((event) => event.id)).toEqual([testId(900)]);
  });

  it("rejects a damaged backup before changing local progress", async () => {
    const database = createDatabase();
    const files = new MemoryBackupFiles();
    files.picked = '{"format":"flashcard-reels-progress","version":99}';
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.study,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle),
      files,
      clock
    );

    await expect(backup.prepareRestore()).rejects.toThrow();
    expect(files.safetyCopy).toBeNull();
    expect(await database.drizzle.select().from(studySessions)).toHaveLength(0);
  });

  it("keeps progress archived when its deck is absent on the receiving device", async () => {
    const target = createDatabase();
    const timestamp = "2026-01-01T00:00:00.000Z";
    const document: ProgressBackupDocument = {
      format: "flashcard-reels-progress",
      version: 1,
      exportedAt: timestamp,
      deckProgress: [
        {
          deckId: TEST_DECK_ID,
          title: "Removed deck",
          version: 2,
          lastReviewedAt: timestamp,
          resolution: "active",
        },
      ],
      flashcardProgress: [],
      flashcardMemoryStates: [],
      reviewEvents: [],
    };

    await new SQLiteProgressBackupRestoreTransaction(target.drizzle).restore(document);

    const restored = await new SQLiteProgressBackupQuery(target.drizzle).read(timestamp);
    expect(restored.deckProgress[0]?.resolution).toBe("archived");
    expect(restored.deckProgress[0]?.title).toBe("Removed deck");
  });

  it("rolls back all deletions if a restore row fails a SQLite constraint", async () => {
    const target = createDatabase();
    const timestamp = "2026-01-01T00:00:00.000Z";
    await target.drizzle.insert(reviewEvents).values({
      id: testId(950),
      deckId: TEST_DECK_ID,
      flashcardId: testId(1),
      rating: "good",
      reviewedAt: timestamp,
      finalizedAt: timestamp,
    });
    const invalid: ProgressBackupDocument = {
      format: "flashcard-reels-progress",
      version: 1,
      exportedAt: timestamp,
      deckProgress: [],
      flashcardProgress: [
        {
          flashcardId: testId(2),
          deckId: TEST_DECK_ID,
          reviewCount: 0,
          againCount: 0,
          hardCount: 0,
          goodCount: 0,
          easyCount: 0,
          firstReviewedAt: timestamp,
          lastReviewedAt: null,
          resetAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      flashcardMemoryStates: [],
      reviewEvents: [],
    };

    await expect(
      new SQLiteProgressBackupRestoreTransaction(target.drizzle).restore(invalid)
    ).rejects.toThrow();
    const remainingEvents = await target.drizzle.select().from(reviewEvents);
    expect(remainingEvents.map((event) => event.id)).toEqual([testId(950)]);
  });
});
