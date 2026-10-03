import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultAppPreferences } from "@/features/preferences/domain/app-preferences";
import { SQLitePreferencesRepository } from "@/features/preferences/infrastructure/sqlite-preferences.repository";
import { learnerPreferences } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TEST_DECK_ID, TestClock, testId } from "../support/study-fixtures";

describe("learner preferences in SQLite", () => {
  let database: NodeSqliteDatabase;
  let repository: SQLitePreferencesRepository;
  let clock: TestClock;

  beforeEach(() => {
    database = new NodeSqliteDatabase();
    clock = new TestClock();
    repository = new SQLitePreferencesRepository(database.drizzle, clock, database.rowIds);
  });
  afterEach(() => database.close());

  it("reads defaults without a row and updates the same single row", async () => {
    expect(await repository.load()).toEqual(defaultAppPreferences);
    expect(database.drizzle.select().from(learnerPreferences).all()).toEqual([]);
    const preferences = {
      ...defaultAppPreferences,
      colorMode: "light" as const,
      audioEnabled: false,
    };
    await repository.save(preferences);
    const original = database.drizzle.select().from(learnerPreferences).get();
    await repository.save({ ...preferences, readingEnabled: false });
    const reloaded = new SQLitePreferencesRepository(database.drizzle, clock, database.rowIds);
    expect(await reloaded.load()).toEqual({ ...preferences, readingEnabled: false });
    expect(database.drizzle.select().from(learnerPreferences).all()).toMatchObject([
      {
        id: original?.id,
        updatedAt: "2026-01-01T00:00:02.000Z",
        audioEnabled: false,
        readingEnabled: false,
      },
    ]);
    expect(() =>
      database.drizzle
        .insert(learnerPreferences)
        .values({
          ...defaultAppPreferences,
          id: testId(300),
          updatedAt: clock.now(),
        })
        .run()
    ).toThrow();
  });

  it("keeps preferences when all learning progress is reset", async () => {
    await seedDeck(database, TEST_DECK_ID, [testId(1)]);
    const preferences = { ...defaultAppPreferences, hapticsEnabled: false };
    await repository.save(preferences);
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator());
    await graph.flashcardProgress.resetAllProgress();
    expect(await repository.load()).toEqual(preferences);
  });

  it.each([
    ["color_mode", "sepia"],
    ["study_island_position", "top"],
    ["rating_direction", "sideways"],
    ["audio_side", "left"],
    ["reading_side", "right"],
    ["audio_enabled", 2],
    ["reading_enabled", 2],
    ["haptics_enabled", 2],
  ])("rejects disallowed %s values in SQLite", async (column, value) => {
    await repository.save(defaultAppPreferences);
    await expect(
      database.runAsync(`UPDATE learner_preferences SET ${column} = ?`, value)
    ).rejects.toThrow();
    expect(await repository.load()).toEqual(defaultAppPreferences);
  });
});
