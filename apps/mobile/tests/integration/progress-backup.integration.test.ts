import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import type { ProgressBackupFileGateway } from "@/features/progress-backup/application/progress-backup-file.gateway";

import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteLearningProgressResetTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset-transaction";
import { ProgressBackupServiceImpl } from "@/features/progress-backup/application/progress-backup.service.impl";
import {
  ProgressBackupDocumentSchema,
  type ProgressBackupDocument,
} from "@/features/progress-backup/contracts/progress-backup.schema";
import {
  ProgressBackupValidationError,
  type ProgressBackupVersionError,
} from "@/features/progress-backup/domain/progress-backup.errors";
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
  readonly copies = new Map<string, ProgressBackupDocument>();
  failSafetyCopy = false;
  private nextFile = 0;

  get safetyCopy(): ProgressBackupDocument | null {
    return [...this.copies.values()].at(-1) ?? null;
  }

  async pick(): Promise<string | null> {
    return this.picked;
  }
  async share(document: ProgressBackupDocument): Promise<void> {
    this.shared = document;
  }
  async saveSafetyCopy(document: ProgressBackupDocument): Promise<string> {
    if (this.failSafetyCopy) {
      throw new Error("Storage is full");
    }
    const fileName = `safety-copy-${++this.nextFile}.json`;
    this.copies.set(fileName, document);
    return fileName;
  }
  async hasSafetyCopy(fileName: string): Promise<boolean> {
    return this.copies.has(fileName);
  }
  async shareSafetyCopy(fileName: string): Promise<void> {
    this.shared = this.copies.get(fileName) ?? null;
    if (!this.shared) {
      throw new Error("Missing safety copy");
    }
  }
  async deleteSafetyCopy(fileName: string): Promise<void> {
    this.copies.delete(fileName);
  }
}

function loadDeviceFixture(): ProgressBackupDocument {
  const fixture: unknown = JSON.parse(
    readFileSync(".maestro/fixtures/progress-backup.json", "utf8")
  );
  return ProgressBackupDocumentSchema.parse(fixture);
}

function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) {
    throw new Error("Expected a fixture row");
  }
  return row;
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
    const document = loadDeviceFixture();
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

    expect(await backup.restore(prepared)).toBe(true);

    const restored = await new SQLiteProgressBackupQuery(target.drizzle).read(targetClock.now());
    expect(restored.reviewEvents.map((event) => event.id)).toEqual([testId(801)]);
    expect(restored.deckProgress[0]?.resolution).toBe("active");
    expect(restored.flashcardMemoryStates).toHaveLength(1);
    expect(await target.drizzle.select().from(studySessions)).toHaveLength(0);
    expect(files.safetyCopy?.reviewEvents.map((event) => event.id)).toEqual([testId(900)]);

    const safetyCopyFileName = await new SQLiteProgressBackupQuery(
      target.drizzle
    ).readSafetyCopyFileName();
    expect(await backup.restore(prepared)).toBe(false);
    expect(await new SQLiteProgressBackupQuery(target.drizzle).readSafetyCopyFileName()).toBe(
      safetyCopyFileName
    );
    expect(files.copies.size).toBe(1);
    expect(files.safetyCopy?.reviewEvents.map((event) => event.id)).toEqual([testId(900)]);
  });

  it("preserves the last successful safety copy when a later restore fails", async () => {
    const database = createDatabase();
    const original = loadDeviceFixture();
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle).restore(original);
    const files = new MemoryBackupFiles();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const emptyBackup: ProgressBackupDocument = {
      format: "flashcard-reels-progress",
      version: 1,
      exportedAt: clock.now(),
      deckProgress: [],
      flashcardProgress: [],
      flashcardMemoryStates: [],
      reviewEvents: [],
    };
    files.picked = JSON.stringify(emptyBackup);
    const backup = new ProgressBackupServiceImpl(
      graph.study,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle),
      files,
      clock
    );
    const firstRestore = await backup.prepareRestore();
    if (!firstRestore) {
      throw new Error("Expected a prepared restore");
    }
    await backup.restore(firstRestore);
    const successfulCopyName = await query.readSafetyCopyFileName();
    expect(successfulCopyName).not.toBeNull();

    files.picked = JSON.stringify(original);
    const failingBackup = new ProgressBackupServiceImpl(
      graph.study,
      query,
      {
        restore: async () => {
          throw new Error("Simulated restore failure");
        },
      },
      files,
      clock
    );
    const laterRestore = await failingBackup.prepareRestore();
    if (!laterRestore) {
      throw new Error("Expected a prepared restore");
    }
    await expect(failingBackup.restore(laterRestore)).rejects.toMatchObject({
      code: "PROGRESS_BACKUP_RESTORE_FAILED",
    });
    expect(await query.readSafetyCopyFileName()).toBe(successfulCopyName);
    expect(files.copies.size).toBe(1);
    expect(await query.read(emptyBackup.exportedAt)).toEqual(emptyBackup);
    await failingBackup.shareSafetyCopy();
    expect(files.shared?.reviewEvents).toHaveLength(1);

    const successfulRetry = await backup.prepareRestore();
    if (!successfulRetry) {
      throw new Error("Expected a prepared restore");
    }
    expect(await backup.restore(successfulRetry)).toBe(true);
    expect(await query.readSafetyCopyFileName()).not.toBe(successfulCopyName);
    expect(files.copies.size).toBe(1);
    expect(files.safetyCopy?.reviewEvents).toHaveLength(0);
  });

  it("reports an unsupported backup version before changing local progress", async () => {
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

    await expect(backup.prepareRestore()).rejects.toMatchObject({
      name: "ProgressBackupVersionError",
      code: "PROGRESS_BACKUP_VERSION_UNSUPPORTED",
      message: "The progress backup version is unsupported",
      context: { version: 99 },
    } satisfies Partial<ProgressBackupVersionError>);
    expect(files.safetyCopy).toBeNull();
    expect(await database.drizzle.select().from(studySessions)).toHaveLength(0);
  });

  it("classifies malformed JSON as an invalid backup", async () => {
    const database = createDatabase();
    const files = new MemoryBackupFiles();
    files.picked = "{";
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.study,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle),
      files,
      clock
    );

    await expect(backup.prepareRestore()).rejects.toMatchObject({
      name: "ProgressBackupValidationError",
      code: "PROGRESS_BACKUP_INVALID",
      message: "The progress backup is invalid or damaged",
    } satisfies Partial<ProgressBackupValidationError>);
  });

  it("exports a card reset without inventing review history or deck progress", async () => {
    const database = createDatabase();
    const flashcardId = testId(1);
    await seedDeck(database, TEST_DECK_ID, [flashcardId]);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const session = makeSession(testId(707), "focused", TEST_DECK_ID);
    await graph.sessions.create(session);
    await database.drizzle.insert(flashcardReviewAttempts).values({
      id: testId(808),
      studySessionId: session.id,
      flashcardId,
      reelPosition: 0,
      rating: "good",
      ratedAt: clock.now(),
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await graph.study.completeSession(session.id);
    const resetAt = clock.now();
    await new SQLiteLearningProgressResetTransaction(database.drizzle).resetCard(
      flashcardId,
      resetAt
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

    expect(files.shared?.deckProgress).toHaveLength(0);
    expect(files.shared?.reviewEvents).toHaveLength(0);
    expect(files.shared?.flashcardMemoryStates).toHaveLength(0);
    expect(files.shared?.flashcardProgress).toMatchObject([
      { flashcardId, reviewCount: 0, resetAt },
    ]);
  });

  it.each([
    [
      "rating totals",
      (document: ProgressBackupDocument) => {
        firstRow(document.flashcardProgress).goodCount = 0;
        firstRow(document.flashcardProgress).hardCount = 1;
      },
    ],
    [
      "review dates",
      (document: ProgressBackupDocument) => {
        firstRow(document.flashcardProgress).firstReviewedAt = "2025-12-31T12:00:00.000Z";
      },
    ],
    [
      "deck ownership",
      (document: ProgressBackupDocument) => {
        firstRow(document.flashcardMemoryStates).deckId = testId(999);
      },
    ],
    [
      "deck review date",
      (document: ProgressBackupDocument) => {
        firstRow(document.deckProgress).lastReviewedAt = "2025-12-31T12:00:00.000Z";
      },
    ],
    [
      "duplicate review IDs",
      (document: ProgressBackupDocument) => {
        document.reviewEvents.push({ ...firstRow(document.reviewEvents) });
        firstRow(document.flashcardProgress).reviewCount = 2;
        firstRow(document.flashcardProgress).goodCount = 2;
      },
    ],
  ] as const)("rejects inconsistent %s without changing saved progress", async (_, corrupt) => {
    const database = createDatabase();
    const original = loadDeviceFixture();
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle).restore(original);
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const before = await query.read(original.exportedAt);
    const incoming = structuredClone(original);
    corrupt(incoming);
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify(incoming);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.study,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle),
      files,
      clock
    );

    await expect(backup.prepareRestore()).rejects.toBeInstanceOf(ProgressBackupValidationError);
    expect(await query.read(original.exportedAt)).toEqual(before);
    expect(files.safetyCopy).toBeNull();
  });

  it("retains current progress when the safety copy cannot be saved", async () => {
    const database = createDatabase();
    const original = loadDeviceFixture();
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle).restore(original);
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const before = await query.read(original.exportedAt);
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify({
      format: "flashcard-reels-progress",
      version: 1,
      exportedAt: original.exportedAt,
      deckProgress: [],
      flashcardProgress: [],
      flashcardMemoryStates: [],
      reviewEvents: [],
    });
    files.failSafetyCopy = true;
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.study,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle),
      files,
      clock
    );
    const prepared = await backup.prepareRestore();
    if (!prepared) {
      throw new Error("Expected a prepared restore");
    }

    await expect(backup.restore(prepared)).rejects.toMatchObject({
      code: "PROGRESS_BACKUP_RESTORE_FAILED",
    });
    expect(await query.read(original.exportedAt)).toEqual(before);
  });

  it("keeps progress archived when its deck is absent on the receiving device", async () => {
    const target = createDatabase();
    const document = loadDeviceFixture();
    firstRow(document.deckProgress).resolution = "active";

    await new SQLiteProgressBackupRestoreTransaction(target.drizzle).restore(document);

    const restored = await new SQLiteProgressBackupQuery(target.drizzle).read(document.exportedAt);
    expect(restored.deckProgress[0]?.resolution).toBe("archived");
    expect(restored.deckProgress[0]?.title).toBe("Versioned Test Deck");
  });

  it("activates matching archived progress when the deck is installed later", async () => {
    const database = createDatabase();
    const document = loadDeviceFixture();
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const transaction = new SQLiteProgressBackupRestoreTransaction(database.drizzle);
    await transaction.restore(document);
    const archived = await query.read(document.exportedAt);
    expect(archived.deckProgress[0]?.resolution).toBe("archived");
    await seedDeck(database, firstRow(document.deckProgress).deckId, [
      firstRow(document.flashcardProgress).flashcardId,
    ]);

    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify(document);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(graph.study, query, transaction, files, clock);
    const prepared = await backup.prepareRestore();
    if (!prepared) {
      throw new Error("Expected a prepared restore");
    }

    expect(await backup.restore(prepared)).toBe(true);
    const restored = await query.read(document.exportedAt);
    expect(restored.deckProgress[0]?.resolution).toBe("active");
    expect(await backup.hasSafetyCopy()).toBe(true);
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
