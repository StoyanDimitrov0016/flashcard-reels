import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  createScenarioGraph,
  seedDeck,
  type ScenarioGraph,
} from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

describe("study feed intents through SQLite", () => {
  let database: NodeSqliteDatabase;
  let graph: ScenarioGraph;
  const cards = [makeFlashcard(1)];
  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [testId(1)]);
    graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    database.close();
  });
  async function open() {
    return graph.runtime.openFeed({
      cards,
      scope: "discover",
      deckId: null,
      replaceExisting: false,
      anchorFlashcardId: null,
    });
  }
  it("persists a plain activation without rebuilding the feed", async () => {
    const opened = await open();
    const refresh = vi.spyOn(graph.feed, "refreshFeed");
    const result = await graph.runtime.activateCard({
      cards,
      sessionId: opened.feed.studySessionId,
      reelPosition: 1,
    });
    expect(result).toEqual({ snapshot: null, extensionError: null });
    expect(refresh).not.toHaveBeenCalled();
    expect(await graph.sessions.findById(opened.feed.studySessionId)).toMatchObject({
      currentReelPosition: 1,
      furthestReelPosition: 1,
    });
    expect(
      await graph.attempts.findBySessionAndReelPosition(opened.feed.studySessionId, 1)
    ).not.toBeNull();
  });
  it("saves a rating while an activation's conditional extension is slow", async () => {
    const opened = await open();
    const gate = deferred<void>();
    const entered = deferred<void>();
    const extend = graph.feed.extendFeed.bind(graph.feed);
    vi.spyOn(graph.feed, "extendFeed").mockImplementationOnce(async (...args) => {
      entered.resolve();
      await gate.promise;
      return extend(...args);
    });
    const input = { cards, sessionId: opened.feed.studySessionId, reelPosition: 4 };
    const activation = graph.runtime.activateCard(input);
    await entered.promise;
    const rated = await graph.runtime.rateCard({ ...input, rating: "good" });
    expect(rated.status).toBe("rated");
    const saved = await graph.attempts.findBySessionAndReelPosition(input.sessionId, 4);
    expect(saved?.rating).toBe("good");
    gate.resolve();
    const activated = await activation;
    expect(activated.extensionError).toBeNull();
  });
  it("keeps extension failure separate from persisted activation", async () => {
    const opened = await open();
    const failure = new Error("offline");
    vi.spyOn(graph.feed, "extendFeed").mockRejectedValueOnce(failure);
    const result = await graph.runtime.activateCard({
      cards,
      sessionId: opened.feed.studySessionId,
      reelPosition: 4,
    });
    expect(result.extensionError).toBe(failure);
    expect(await graph.sessions.findById(opened.feed.studySessionId)).toMatchObject({
      currentReelPosition: 4,
      furthestReelPosition: 4,
    });
  });
  it("finds existing attempts from SQLite across new service instances", async () => {
    const opened = await open();
    const input = { cards, sessionId: opened.feed.studySessionId, reelPosition: 0 };
    await graph.runtime.rateCard({ ...input, rating: "good" });
    const resumed = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator(2000));
    await resumed.runtime.rateCard({ ...input, rating: "easy" });
    expect(
      await graph.attempts.listBySessionAndReelPositionRange(input.sessionId, 0, 0)
    ).toHaveLength(1);
    const saved = await graph.attempts.findBySessionAndReelPosition(input.sessionId, 0);
    expect(saved?.rating).toBe("easy");
  });
});
