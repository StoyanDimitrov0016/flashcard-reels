import { describe, expect, it, vi } from "vitest";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

describe("feed extension state", () => {
  it("preserves a visible-card write made while materialization is pending", async () => {
    const database = new NodeSqliteDatabase();
    try {
      await seedDeck(database, TEST_DECK_ID, [testId(1)]);
      const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
      const cards = [makeFlashcard(1)];
      const feed = await graph.feed.prepareFeed(cards, "discover", null, false, null);
      const entered = deferred<void>();
      const release = deferred<void>();
      const findStates = graph.memoryStates.findByFlashcardIds.bind(graph.memoryStates);
      vi.spyOn(graph.memoryStates, "findByFlashcardIds").mockImplementationOnce(async (ids) => {
        entered.resolve();
        await release.promise;
        return findStates(ids);
      });
      const extension = graph.feed.extendFeed(cards, feed.studySessionId);
      await entered.promise;
      await graph.feed.recordVisibleCard(feed.studySessionId, testId(1));
      const visible = await graph.sessions.findById(feed.studySessionId);
      release.resolve();
      await extension;
      const extended = await graph.sessions.findById(feed.studySessionId);
      expect(extended?.feedState).toBe(visible?.feedState);
      expect(JSON.parse(extended?.feedState ?? "{}")).toEqual({ recentCardIds: [testId(1)] });
    } finally {
      database.close();
    }
  });
});
