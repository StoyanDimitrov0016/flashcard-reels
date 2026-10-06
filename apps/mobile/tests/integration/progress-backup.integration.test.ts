import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteLearningProgressResetTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset.transaction";
import { defaultAppPreferences } from "@/features/preferences/domain/app-preferences";
import { SQLitePreferencesRepository } from "@/features/preferences/infrastructure/sqlite-preferences.repository";
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
  flashcards,
  flashcardProgress,
  flashcardReviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

import { MemoryBackupFiles } from "../support/memory-backup-files";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeSession,
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "../support/study-fixtures";

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

  it("round trips preferences and themes with progress, replacing the target learner data", async () => {
    const source = createDatabase();
    const clock = new TestClock();
    await seedDeck(source, TEST_DECK_ID, [testId(1)]);
    const preferences = {
      colorMode: "light" as const,
      studyIslandPosition: "left" as const,
      ratingDirection: "reverse" as const,
      audioEnabled: false,
      audioSide: "opposite" as const,
      readingEnabled: false,
      readingSide: "primary" as const,
      hapticsEnabled: false,
    };
    await new SQLitePreferencesRepository(source.drizzle, clock, source.rowIds).save(preferences);
    const themes = new SQLiteDeckThemeSelectionRepository(source.drizzle, source.rowIds);
    await themes.save(new DeckThemeSelection({ deckId: TEST_DECK_ID, theme: "cyan" }));
    await themes.save(new DeckThemeSelection({ deckId: OTHER_DECK_ID, theme: "rose" }));
    const graph = createScenarioGraph(source, clock, new SequenceIdGenerator());
    const { session } = await graph.study.openSession("focus", TEST_DECK_ID, false);
    const attemptId = await graph.study.startAttempt(testId(1), 0, session.id);
    await graph.study.rateAttempt(attemptId, "good");
    const files = new MemoryBackupFiles();
    await new ProgressBackupServiceImpl(
      graph.runtime,
      new SQLiteProgressBackupQuery(source.drizzle),
      new SQLiteProgressBackupRestoreTransaction(source.drizzle, source.rowIds),
      files,
      clock
    ).exportProgress();
    const exported = files.shared;
    if (!exported) {
      throw new Error("Missing exported learner data");
    }
    expect(exported.learnerPreferences).toMatchObject(preferences);
    expect(exported.learnerPreferences).not.toHaveProperty("id");
    expect(exported.deckThemeSelections).toEqual([
      { deckId: TEST_DECK_ID, theme: "cyan" },
      { deckId: OTHER_DECK_ID, theme: "rose" },
    ]);
    const target = createDatabase();
    await seedDeck(target, TEST_DECK_ID, [testId(1)]);
    await new SQLitePreferencesRepository(target.drizzle, clock, target.rowIds).save(
      defaultAppPreferences
    );
    await new SQLiteDeckThemeSelectionRepository(target.drizzle, target.rowIds).save(
      new DeckThemeSelection({ deckId: testId(999), theme: "gold" })
    );
    const targetGraph = createScenarioGraph(target, clock, new SequenceIdGenerator());
    const query = new SQLiteProgressBackupQuery(target.drizzle);
    const backup = new ProgressBackupServiceImpl(
      targetGraph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(target.drizzle, target.rowIds),
      files,
      clock
    );
    files.picked = JSON.stringify(exported);
    const prepared = await backup.prepareRestore();
    if (!prepared) {
      throw new Error("Missing prepared learner data restore");
    }
    await backup.restore(prepared);
    expect(
      await new SQLitePreferencesRepository(target.drizzle, clock, target.rowIds).load()
    ).toEqual(preferences);
    expect(await query.read(exported.exportedAt)).toEqual(exported);
  });

  it.each(["missing preferences", "old format", "duplicate themes"])(
    "rejects %s without altering learner data",
    async (invalidCase) => {
      const database = createDatabase();
      const original = loadDeviceFixture();
      const query = new SQLiteProgressBackupQuery(database.drizzle);
      await new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds).restore(
        original
      );
      const before = await query.read(original.exportedAt);
      const invalid: Record<string, unknown> = { ...before };
      if (invalidCase === "missing preferences") {
        delete invalid.learnerPreferences;
      } else if (invalidCase === "old format") {
        invalid.format = "flashcard-reels-progress";
      } else {
        invalid.deckThemeSelections = [
          { deckId: TEST_DECK_ID, theme: "cyan" },
          { deckId: TEST_DECK_ID, theme: "rose" },
        ];
      }
      const clock = new TestClock();
      const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
      const files = new MemoryBackupFiles();
      files.picked = JSON.stringify(invalid);
      const backup = new ProgressBackupServiceImpl(
        graph.runtime,
        query,
        new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
        files,
        clock
      );
      await expect(backup.prepareRestore()).rejects.toBeInstanceOf(ProgressBackupValidationError);
      expect(await query.read(original.exportedAt)).toEqual(before);
    }
  );

  it.each([
    ["colorMode", "sepia"],
    ["studyIslandPosition", "top"],
    ["ratingDirection", "sideways"],
    ["audioSide", "left"],
    ["readingSide", "right"],
    ["audioEnabled", 2],
    ["readingEnabled", 2],
    ["hapticsEnabled", 2],
  ])("rejects invalid backup preference %s", async (key, value) => {
    const database = createDatabase();
    const original = loadDeviceFixture();
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds).restore(
      original
    );
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const before = await query.read(original.exportedAt);
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify({
      ...before,
      learnerPreferences: { ...before.learnerPreferences, [key]: value },
    });
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
      files,
      clock
    );
    await expect(backup.prepareRestore()).rejects.toBeInstanceOf(ProgressBackupValidationError);
    expect(await query.read(original.exportedAt)).toEqual(before);
  });

  it("keeps the device import fixture compatible with the backup format", () => {
    const document = loadDeviceFixture();
    expect(document.flashcardReviewEvents).toHaveLength(1);
  });

  it.each([
    ["2026-09-06T13:26:00Z", "2026-09-06T13:26:00.000Z"],
    ["2026-09-06T16:26:00+03:00", "2026-09-06T13:26:00.000Z"],
  ])(
    "exports package timestamps %s in the canonical backup format",
    async (createdAt, expected) => {
      const database = createDatabase();
      const flashcardId = testId(1);
      await seedDeck(database, TEST_DECK_ID, [flashcardId]);
      await database.drizzle.update(flashcards).set({ createdAt });
      const clock = new TestClock();
      const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
      const { session } = await graph.study.openSession("discover", null, false);
      const attemptId = await graph.study.startAttempt(flashcardId, 0, session.id);
      await graph.study.rateAttempt(attemptId, "good");
      const files = new MemoryBackupFiles();
      const backup = new ProgressBackupServiceImpl(
        graph.runtime,
        new SQLiteProgressBackupQuery(database.drizzle),
        new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
        files,
        clock
      );

      await backup.exportProgress();

      expect(files.shared?.flashcardProgress[0]?.createdAt).toBe(expected);
      expect(files.shared?.flashcardReviewEvents).toHaveLength(1);
      const stored = await database.drizzle.select().from(flashcardProgress);
      expect(stored[0]?.createdAt).toBe(createdAt);
      files.picked = JSON.stringify(files.shared);
      const prepared = await backup.prepareRestore();
      if (!prepared) {
        throw new Error("Expected an exported backup to be readable");
      }
      expect(await backup.restore(prepared)).toBe(false);
    }
  );

  it("exports progress after rating cards through the study service", async () => {
    const database = createDatabase();
    const cardIds = [testId(1), testId(2), testId(3), testId(4)];
    await seedDeck(database, TEST_DECK_ID, cardIds);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { session } = await graph.study.openSession("discover", null, false);
    const ratings = ["again", "hard", "good", "easy"] as const;
    // oxlint-disable no-await-in-loop -- Rate each card in the order a learner studies it.
    for (const [position, rating] of ratings.entries()) {
      const attemptId = await graph.study.startAttempt(testId(position + 1), position, session.id);
      await graph.study.rateAttempt(attemptId, rating);
      await graph.study.updateSessionReelPosition(session.id, position + 1);
    }
    // oxlint-enable no-await-in-loop
    const files = new MemoryBackupFiles();
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
      files,
      clock
    );

    await backup.exportProgress();

    expect(files.shared?.flashcardReviewEvents.map((event) => event.rating)).toEqual(ratings);
    expect(files.shared?.flashcardProgress).toHaveLength(4);
    expect(files.shared?.flashcardMemoryStates).toHaveLength(4);
  });

  it("preserves committed progress and the native cause when sharing an export fails", async () => {
    const database = createDatabase();
    const flashcardId = testId(1);
    await seedDeck(database, TEST_DECK_ID, [flashcardId]);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { session } = await graph.study.openSession("discover", null, false);
    const attemptId = await graph.study.startAttempt(flashcardId, 0, session.id);
    await graph.study.rateAttempt(attemptId, "good");
    const cause = new Error("File sharing is unavailable on this device");
    const files = new MemoryBackupFiles();
    files.share = async () => {
      throw cause;
    };
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
      files,
      clock
    );

    await expect(backup.exportProgress()).rejects.toMatchObject({
      code: "PROGRESS_BACKUP_EXPORT_FAILED",
      context: { stage: "share-file" },
      cause,
    });

    const retained = await query.read(clock.now());
    expect(retained.flashcardReviewEvents).toHaveLength(1);
    expect(retained.flashcardProgress[0]?.reviewCount).toBe(1);
  });

  it("transfers learning to another device, keeps retries idempotent, and resumes studying", async () => {
    const source = createDatabase();
    const flashcardId = testId(1);
    await seedDeck(source, TEST_DECK_ID, [flashcardId]);
    const sourceClock = new TestClock();
    const sourceGraph = createScenarioGraph(source, sourceClock, new SequenceIdGenerator());
    const session = makeSession(testId(701), "focus", TEST_DECK_ID);
    await sourceGraph.sessions.create(session);
    await source.drizzle.insert(flashcardReviewAttempts).values({
      id: testId(801),
      studySessionId: session.id,
      flashcardId,
      reelPosition: 0,
      rating: "good",
      ratedAt: sourceClock.now(),
      createdAt: sourceClock.now(),
      updatedAt: sourceClock.now(),
    });
    const exportedFiles = new MemoryBackupFiles();
    const sourceBackup = new ProgressBackupServiceImpl(
      sourceGraph.runtime,
      new SQLiteProgressBackupQuery(source.drizzle),
      new SQLiteProgressBackupRestoreTransaction(source.drizzle, source.rowIds),
      exportedFiles,
      sourceClock
    );
    await sourceBackup.exportProgress();
    const exported = exportedFiles.shared;
    if (!exported) {
      throw new Error("Expected an exported document");
    }

    const target = createDatabase();
    await seedDeck(target, TEST_DECK_ID, [flashcardId]);
    const targetClock = new TestClock();
    const targetGraph = createScenarioGraph(target, targetClock, new SequenceIdGenerator());
    const importedFiles = new MemoryBackupFiles();
    importedFiles.picked = JSON.stringify(exported);
    const targetQuery = new SQLiteProgressBackupQuery(target.drizzle);
    const targetBackup = new ProgressBackupServiceImpl(
      targetGraph.runtime,
      targetQuery,
      new SQLiteProgressBackupRestoreTransaction(target.drizzle, target.rowIds),
      importedFiles,
      targetClock
    );
    const prepared = await targetBackup.prepareRestore();
    if (!prepared) {
      throw new Error("Expected a prepared restore");
    }
    expect(await targetBackup.restore(prepared)).toBe(true);
    const restored = await targetQuery.read(exported.exportedAt);
    expect(restored.flashcardReviewEvents).toEqual(exported.flashcardReviewEvents);
    expect(restored.flashcardProgress).toEqual(exported.flashcardProgress);
    expect(restored.flashcardMemoryStates).toEqual(exported.flashcardMemoryStates);
    expect(restored.deckProgress).toEqual(exported.deckProgress);

    const safetyCopyFileName = await targetQuery.readSafetyCopyFileName();
    const retry = await targetBackup.prepareRestore();
    if (!retry) {
      throw new Error("Expected a prepared retry");
    }
    expect(await targetBackup.restore(retry)).toBe(false);
    expect(await targetQuery.readSafetyCopyFileName()).toBe(safetyCopyFileName);

    targetClock.advance(24 * 60 * 60 * 1000);
    const opened = await targetGraph.study.openSession("focus", TEST_DECK_ID, false);
    const newAttemptId = await targetGraph.study.startAttempt(flashcardId, 0, opened.session.id);
    await targetGraph.study.rateAttempt(newAttemptId, "easy");
    await targetGraph.study.completeSession(opened.session.id);
    await targetBackup.exportProgress();
    const continued = importedFiles.shared;
    if (!continued) {
      throw new Error("Expected an export after continuing study");
    }
    expect(continued.flashcardReviewEvents).toHaveLength(2);
    expect(continued.flashcardReviewEvents).toEqual(
      expect.arrayContaining(exported.flashcardReviewEvents)
    );
    expect(continued.flashcardProgress).toMatchObject([
      { flashcardId, reviewCount: 2, goodCount: 1, easyCount: 1 },
    ]);
    expect(continued.flashcardMemoryStates).toHaveLength(1);
    expect(firstRow(continued.flashcardMemoryStates).reps).toBe(
      firstRow(exported.flashcardMemoryStates).reps + 1
    );
    expect(continued.deckProgress).toHaveLength(1);
  });

  it("closes an active session and drains progress beyond the foreground batch limit", async () => {
    const database = createDatabase();
    const cardIds = Array.from({ length: 60 }, (_, index) => testId(index + 1));
    await seedDeck(database, TEST_DECK_ID, cardIds);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const session = makeSession(testId(700), "focus", TEST_DECK_ID, 0, 59);
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
      graph.runtime,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
      files,
      clock
    );

    await backup.exportProgress();

    expect(files.shared?.flashcardReviewEvents).toHaveLength(60);
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
    const session = makeSession(testId(701), "focus", TEST_DECK_ID);
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
    await new SQLiteDeckRemovalTransaction(source.drizzle, source.rowIds).remove(TEST_DECK_ID);
    const archived = await new SQLiteProgressBackupQuery(source.drizzle).read(sourceClock.now());
    expect(archived.deckProgress[0]?.status).toBe("archived");

    const target = createDatabase();
    await seedDeck(target, TEST_DECK_ID, [cardId]);
    const targetClock = new TestClock();
    const targetGraph = createScenarioGraph(target, targetClock, new SequenceIdGenerator());
    await target.drizzle.insert(studySessions).values({
      id: testId(901),
      scope: "focus",
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
      scope: "discover",
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
      targetGraph.runtime,
      new SQLiteProgressBackupQuery(target.drizzle),
      new SQLiteProgressBackupRestoreTransaction(target.drizzle, target.rowIds),
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
    expect(restored.flashcardReviewEvents.map((event) => event.id)).toEqual([testId(801)]);
    expect(restored.deckProgress[0]?.status).toBe("active");
    expect(restored.flashcardMemoryStates).toHaveLength(1);
    expect(await target.drizzle.select().from(studySessions)).toHaveLength(0);
    expect(files.safetyCopy?.flashcardReviewEvents.map((event) => event.id)).toEqual([testId(900)]);

    const safetyCopyFileName = await new SQLiteProgressBackupQuery(
      target.drizzle
    ).readSafetyCopyFileName();
    expect(await backup.restore(prepared)).toBe(false);
    expect(await new SQLiteProgressBackupQuery(target.drizzle).readSafetyCopyFileName()).toBe(
      safetyCopyFileName
    );
    expect(files.copies.size).toBe(1);
    expect(files.safetyCopy?.flashcardReviewEvents.map((event) => event.id)).toEqual([testId(900)]);
  });

  it("preserves the last successful safety copy when a later restore fails", async () => {
    const database = createDatabase();
    const original = loadDeviceFixture();
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds).restore(
      original
    );
    const files = new MemoryBackupFiles();
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const emptyBackup: ProgressBackupDocument = {
      format: "flashcard-reels-learner-data",
      learnerPreferences: { ...defaultAppPreferences, updatedAt: "2026-01-01T00:00:00.000Z" },
      deckThemeSelections: [],
      version: 1,
      exportedAt: clock.now(),
      deckProgress: [],
      flashcardProgress: [],
      flashcardMemoryStates: [],
      flashcardReviewEvents: [],
    };
    files.picked = JSON.stringify(emptyBackup);
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
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
      graph.runtime,
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
    expect(files.shared?.flashcardReviewEvents).toHaveLength(1);

    const successfulRetry = await backup.prepareRestore();
    if (!successfulRetry) {
      throw new Error("Expected a prepared restore");
    }
    expect(await backup.restore(successfulRetry)).toBe(true);
    expect(await query.readSafetyCopyFileName()).not.toBe(successfulCopyName);
    expect(files.copies.size).toBe(1);
    expect(files.safetyCopy?.flashcardReviewEvents).toHaveLength(0);
  });

  it("reports an unsupported backup version before changing local progress", async () => {
    const database = createDatabase();
    const files = new MemoryBackupFiles();
    files.picked = '{"format":"flashcard-reels-learner-data","version":99}';
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
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
      graph.runtime,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
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
    const session = makeSession(testId(707), "focus", TEST_DECK_ID);
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
    await new SQLiteLearningProgressResetTransaction(database.drizzle, database.rowIds).resetCard(
      flashcardId,
      resetAt
    );
    const files = new MemoryBackupFiles();
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      new SQLiteProgressBackupQuery(database.drizzle),
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
      files,
      clock
    );

    await backup.exportProgress();

    expect(files.shared?.deckProgress).toHaveLength(0);
    expect(files.shared?.flashcardReviewEvents).toHaveLength(0);
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
        document.flashcardReviewEvents.push({ ...firstRow(document.flashcardReviewEvents) });
        firstRow(document.flashcardProgress).reviewCount = 2;
        firstRow(document.flashcardProgress).goodCount = 2;
      },
    ],
  ] as const)("rejects inconsistent %s without changing saved progress", async (_, corrupt) => {
    const database = createDatabase();
    const original = loadDeviceFixture();
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds).restore(
      original
    );
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const before = await query.read(original.exportedAt);
    const incoming = structuredClone(original);
    corrupt(incoming);
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify(incoming);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
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
    await new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds).restore(
      original
    );
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const before = await query.read(original.exportedAt);
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify({
      format: "flashcard-reels-learner-data",
      learnerPreferences: { ...defaultAppPreferences, updatedAt: "2026-01-01T00:00:00.000Z" },
      deckThemeSelections: [],
      version: 1,
      exportedAt: original.exportedAt,
      deckProgress: [],
      flashcardProgress: [],
      flashcardMemoryStates: [],
      flashcardReviewEvents: [],
    });
    files.failSafetyCopy = true;
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
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
    firstRow(document.deckProgress).status = "active";

    await new SQLiteProgressBackupRestoreTransaction(target.drizzle, target.rowIds).restore(
      document
    );

    const restored = await new SQLiteProgressBackupQuery(target.drizzle).read(document.exportedAt);
    expect(restored.deckProgress[0]?.status).toBe("archived");
    expect(restored.deckProgress[0]?.title).toBe("Versioned Test Deck");
  });

  it("activates matching archived progress when the deck is installed later", async () => {
    const database = createDatabase();
    const document = loadDeviceFixture();
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const transaction = new SQLiteProgressBackupRestoreTransaction(
      database.drizzle,
      database.rowIds
    );
    await transaction.restore(document);
    const archived = await query.read(document.exportedAt);
    expect(archived.deckProgress[0]?.status).toBe("archived");
    await seedDeck(database, firstRow(document.deckProgress).deckId, [
      firstRow(document.flashcardProgress).flashcardId,
    ]);

    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify(document);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const backup = new ProgressBackupServiceImpl(graph.runtime, query, transaction, files, clock);
    const prepared = await backup.prepareRestore();
    if (!prepared) {
      throw new Error("Expected a prepared restore");
    }

    expect(await backup.restore(prepared)).toBe(true);
    const restored = await query.read(document.exportedAt);
    expect(restored.deckProgress[0]?.status).toBe("active");
    expect(await backup.hasSafetyCopy()).toBe(true);
  });

  it("rolls back all deletions if a restore row fails a SQLite constraint", async () => {
    const target = createDatabase();
    const timestamp = "2026-01-01T00:00:00.000Z";
    await target.drizzle.insert(flashcardReviewEvents).values({
      id: testId(950),
      deckId: TEST_DECK_ID,
      flashcardId: testId(1),
      rating: "good",
      reviewedAt: timestamp,
      committedAt: timestamp,
    });
    const invalid: ProgressBackupDocument = {
      format: "flashcard-reels-learner-data",
      learnerPreferences: { ...defaultAppPreferences, updatedAt: "2026-01-01T00:00:00.000Z" },
      deckThemeSelections: [],
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
      flashcardReviewEvents: [],
    };

    await expect(
      new SQLiteProgressBackupRestoreTransaction(target.drizzle, target.rowIds).restore(invalid)
    ).rejects.toThrow();
    const remainingEvents = await target.drizzle.select().from(flashcardReviewEvents);
    expect(remainingEvents.map((event) => event.id)).toEqual([testId(950)]);
  });

  it("rejects a backup that assigns an installed card to another deck and preserves local learning", async () => {
    const database = createDatabase();
    const incoming = loadDeviceFixture();
    const cardId = firstRow(incoming.flashcardProgress).flashcardId;
    await seedDeck(database, OTHER_DECK_ID, [cardId]);
    const clock = new TestClock();
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    const { session } = await graph.study.openSession("focus", OTHER_DECK_ID, false);
    const attemptId = await graph.study.startAttempt(cardId, 0, session.id);
    await graph.study.rateAttempt(attemptId, "easy");
    await graph.study.completeSession(session.id);
    const query = new SQLiteProgressBackupQuery(database.drizzle);
    const before = await query.read(clock.now());
    const files = new MemoryBackupFiles();
    files.picked = JSON.stringify(incoming);
    const backup = new ProgressBackupServiceImpl(
      graph.runtime,
      query,
      new SQLiteProgressBackupRestoreTransaction(database.drizzle, database.rowIds),
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
    expect(await query.read(before.exportedAt)).toEqual(before);
    const retainedSession = await graph.sessions.findById(session.id);
    expect(retainedSession?.completedAt).not.toBeNull();
    expect(await backup.hasSafetyCopy()).toBe(false);
    expect(files.copies.size).toBe(0);
  });
});
