import { describe, expect, it } from "vitest";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeSession,
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

describe("deck change settlement", () => {
  it.each([
    [false, true],
    [true, true],
    [false, false],
    [true, false],
  ])(
    "preserves unrelated and completed sessions (includeFocus=%s, matching=%s)",
    async (includeFocus, matching) => {
      const database = new NodeSqliteDatabase();
      try {
        const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
        await seedDeck(database, TEST_DECK_ID, [testId(1)]);
        await seedDeck(database, OTHER_DECK_ID, [testId(2)]);
        const discover = makeSession(testId(10), "discover");
        const focus = makeSession(testId(11), "focus", matching ? TEST_DECK_ID : OTHER_DECK_ID);
        const completed = makeSession(testId(13), "discover");
        await graph.sessions.create(completed);
        const completedAt = "2026-01-01T01:00:00.000Z";
        await graph.sessions.complete(completed.id, completedAt);
        await graph.sessions.create(discover);
        await graph.sessions.create(focus);

        await graph.study.settleActiveSessionsAffectedByDeck(TEST_DECK_ID, includeFocus);

        const savedDiscover = await graph.sessions.findById(discover.id);
        const savedFocus = await graph.sessions.findById(focus.id);
        const savedCompleted = await graph.sessions.findById(completed.id);
        expect(savedDiscover?.completedAt).not.toBeNull();
        expect(savedFocus?.completedAt !== null).toBe(includeFocus && matching);
        expect(savedCompleted?.completedAt).toBe(completedAt);
      } finally {
        database.close();
      }
    }
  );
});
