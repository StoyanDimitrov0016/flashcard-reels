import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import { SequenceIdGenerator, TEST_DECK_ID, TestClock, testId } from "../support/study-fixtures";

const SQLiteRowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

describe("database fixed-value constraints", () => {
  let database: NodeSqliteDatabase;
  afterEach(() => database?.close());

  it.each([
    ["flashcard_memory_states", "state", "invalid"],
    ["flashcard_review_events", "rating", "invalid"],
    ["deck_progress", "status", "invalid"],
    ["study_sessions", "scope", "invalid"],
    ["flashcards", "active", 2],
  ])("rejects a disallowed %s.%s on insert", async (table, column, value) => {
    database = new NodeSqliteDatabase();
    const cardId = testId(1);
    await seedDeck(database, TEST_DECK_ID, [cardId]);
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    const { session } = await graph.study.openSession("focus", TEST_DECK_ID, false);
    const attemptId = await graph.study.startAttempt(cardId, 0, session.id);
    await graph.study.rateAttempt(attemptId, "good");
    await graph.study.completeSession(session.id);

    const row = SQLiteRowSchema.parse(
      await database.getFirstAsync(`SELECT * FROM ${table} LIMIT 1`)
    );
    expect(row).toBeTruthy();
    const columns = Object.keys(row);
    const values = columns.map((name) => {
      if (name === "id") {
        return testId(990);
      }
      if (name === column) {
        return value;
      }
      return row[name] ?? null;
    });
    await expect(
      database.runAsync(
        `INSERT INTO ${table} (${columns.map((name) => `"${name}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        ...values
      )
    ).rejects.toThrow(`${table}_${column}_check`);
  });
});
