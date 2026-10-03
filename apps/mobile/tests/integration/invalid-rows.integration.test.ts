import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { defaultAppPreferences } from "@/features/preferences/domain/app-preferences";
import { SQLitePreferencesRepository } from "@/features/preferences/infrastructure/sqlite-preferences.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { seedDeck } from "../support/sqlite-study-scenario";
import {
  makeSession,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

describe("invalid SQLite rows", () => {
  let database: NodeSqliteDatabase;
  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await database.runAsync("PRAGMA ignore_check_constraints = ON");
  });
  afterEach(() => database.close());
  it("identifies the deck and retains the validation cause", async () => {
    await seedDeck(database, TEST_DECK_ID, [testId(1)]);
    await database.runAsync("UPDATE decks SET cover_asset = 'invalid'");
    await expect(
      new SQLiteDeckRepository(database.drizzle).findById(TEST_DECK_ID)
    ).rejects.toMatchObject({
      code: "DATABASE_ROW_INVALID",
      context: { table: "decks", rowId: TEST_DECK_ID },
      cause: { name: "ZodError" },
    });
  });
  it("identifies the session and retains the validation cause", async () => {
    const repository = new SQLiteStudySessionRepository(database.drizzle);
    await repository.create(makeSession(testId(10), "discover"));
    await database.runAsync("UPDATE study_sessions SET scope = 'invalid'");
    await expect(repository.findById(testId(10))).rejects.toMatchObject({
      code: "DATABASE_ROW_INVALID",
      context: { table: "study_sessions", rowId: testId(10) },
      cause: { name: "ZodError" },
    });
  });
  it("identifies invalid preferences and retains the validation cause", async () => {
    const repository = new SQLitePreferencesRepository(
      database.drizzle,
      new TestClock(),
      new SequenceIdGenerator()
    );
    await repository.save(defaultAppPreferences);
    await database.runAsync("UPDATE learner_preferences SET color_mode = 'invalid'");
    await expect(repository.load()).rejects.toMatchObject({
      code: "DATABASE_ROW_INVALID",
      context: { table: "learner_preferences", rowId: testId(1000) },
      cause: { name: "ZodError" },
    });
  });
});
