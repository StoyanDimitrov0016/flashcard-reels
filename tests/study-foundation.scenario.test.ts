import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/domain/review-attempts";
import { NodeSqliteDatabase } from "./support/node-sqlite-database";
import { createScenarioGraph, seedDeck, type ScenarioGraph } from "./support/sqlite-study-scenario";
import {
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "./support/study-test-support";

function cards(deckId: string, count: number, firstId: number): Flashcard[] {
  return Array.from(
    { length: count },
    (_, position) =>
      new Flashcard({
        answer: `Answer ${position}`,
        createdAt: "2026-01-01T00:00:00.000Z",
        deckId,
        position,
        id: testId(firstId + position),
        question: `Question ${position}`,
        active: true,
        updatedAt: "2026-01-01T00:00:00.000Z",
      })
  );
}

function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (!value) {
    throw new Error(`Missing scenario fixture at index ${index}`);
  }
  return value;
}

describe("study foundation learner journeys", () => {
  let database: NodeSqliteDatabase;
  let clock: TestClock;
  let ids: SequenceIdGenerator;
  let graph: ScenarioGraph;
  const focusCards = cards(TEST_DECK_ID, 8, 1);
  const otherCards = cards(OTHER_DECK_ID, 4, 101);

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    clock = new TestClock();
    ids = new SequenceIdGenerator();
    await seedDeck(
      database,
      TEST_DECK_ID,
      focusCards.map((card) => card.id)
    );
    await seedDeck(
      database,
      OTHER_DECK_ID,
      otherCards.map((card) => card.id)
    );
    graph = createScenarioGraph(database, clock, ids);
  });

  afterEach(() => database.close());

  it("preserves a Focus Shuffle journey through recurrence, aggregation, and restart", async () => {
    const opened = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    expect(opened.occurrences.map((item) => item.reelPosition)).toEqual([0, 1, 2, 3, 4, 5]);
    const originalHistory = opened.occurrences.map((item) => item.card.id);
    const again = await graph.study.startAttempt(
      at(opened.occurrences, 0).card.id,
      0,
      opened.studySessionId
    );
    const good = await graph.study.startAttempt(
      at(opened.occurrences, 1).card.id,
      1,
      opened.studySessionId
    );
    expect(await graph.study.rateAttempt(again, "again")).toBe(true);
    expect(await graph.study.rateAttempt(good, "good")).toBe(true);

    const recurrence = at(await graph.recurrences.listBySessionId(opened.studySessionId), 0);
    expect(recurrence.targetReelPosition).toBe(6);
    await graph.feed.extendFeed(focusCards, opened.studySessionId);
    expect(
      (await graph.items.listBySessionId(opened.studySessionId))
        .slice(0, 6)
        .map((x) => x.flashcardId)
    ).toEqual(originalHistory);
    expect(
      (await graph.items.listBySessionId(opened.studySessionId)).some((x) => x.reelPosition === 6)
    ).toBe(false);

    await graph.study.updateSessionReelPosition(opened.studySessionId, 6);
    const atRecurrence = await graph.feed.refreshFeed(focusCards, opened.studySessionId);
    expect(atRecurrence.occurrences.find((item) => item.reelPosition === 6)).toMatchObject({
      card: { id: at(opened.occurrences, 0).card.id },
      recurrenceId: recurrence.id,
    });
    await graph.study.consumeRecurrence(recurrence.id);
    await graph.study.updateSessionReelPosition(opened.studySessionId, 126);
    await graph.study.finalizeAttemptsOutsideEditableWindow(opened.studySessionId, 126);

    const profileRows = await database.getAllAsync(
      "SELECT review_count, again_count, good_count FROM learner_profiles ORDER BY flashcard_id"
    );
    expect(profileRows).toEqual([
      { again_count: 1, good_count: 0, review_count: 1 },
      { again_count: 0, good_count: 1, review_count: 1 },
    ]);
    const storedItems = await graph.items.listBySessionId(opened.studySessionId);
    graph = createScenarioGraph(database, clock, ids);
    const resumed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    expect(resumed.studySessionId).toBe(opened.studySessionId);
    expect(resumed.currentReelPosition).toBe(126);
    expect(
      (await graph.items.listBySessionId(opened.studySessionId)).slice(0, storedItems.length)
    ).toEqual(storedItems);
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_session_recurrences")
    ).toEqual({ count: 1 });
    expect(
      await database.getFirstAsync("SELECT SUM(review_count) AS count FROM learner_profiles")
    ).toEqual({ count: 2 });
  });

  it("preserves Ordered order, expiry, replacement, and bounded completed recovery", async () => {
    const first = await graph.feed.prepareFeed(
      focusCards,
      "focused",
      TEST_DECK_ID,
      false,
      "ordered"
    );
    expect(first.occurrences.map((item) => item.card.id)).toEqual(
      focusCards.slice(0, 6).map((x) => x.id)
    );
    await graph.study.updateSessionReelPosition(first.studySessionId, 7);
    await graph.feed.extendFeed(focusCards, first.studySessionId);
    const wrapped = await graph.feed.refreshFeed(focusCards, first.studySessionId);
    expect(wrapped.occurrences.find((item) => item.reelPosition === 8)?.card.id).toBe(
      at(focusCards, 0).id
    );
    graph = createScenarioGraph(database, clock, ids);
    expect(
      (await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false, "ordered"))
        .studySessionId
    ).toBe(first.studySessionId);

    const attemptId = await graph.study.startAttempt(at(focusCards, 0).id, 0, first.studySessionId);
    await graph.study.rateAttempt(attemptId, "easy");
    clock.advance(FOCUS_SESSION_INACTIVITY_TIMEOUT_MS);
    const expiredReplacement = await graph.feed.prepareFeed(
      focusCards,
      "focused",
      TEST_DECK_ID,
      false,
      "ordered"
    );
    expect(expiredReplacement.studySessionId).not.toBe(first.studySessionId);
    expect((await graph.sessions.findById(first.studySessionId))?.completedAt).not.toBeNull();
    const other = await graph.feed.prepareFeed(
      otherCards,
      "focused",
      OTHER_DECK_ID,
      false,
      "shuffle"
    );
    expect(other.studySessionId).not.toBe(expiredReplacement.studySessionId);
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM study_sessions WHERE scope = 'focused' AND completed_at IS NULL"
      )
    ).toEqual({ count: 1 });
    await graph.study.recoverPendingCompletedSessionAggregation(1);
    expect(
      await database.getFirstAsync(
        "SELECT review_count FROM learner_profiles WHERE flashcard_id = ?",
        at(focusCards, 0).id
      )
    ).toEqual({ review_count: 1 });
    expect(
      (await graph.sessions.findById(first.studySessionId))?.aggregatedThroughReelPosition
    ).toBe(0);
  });

  it("keeps Discover persistent across reconstruction and independent Focus lifecycle", async () => {
    const allCards = [...focusCards, ...otherCards];
    const discover = await graph.feed.prepareFeed(allCards, "mixed", null, false);
    await Promise.all(
      [0, 1].map(async (position) => {
        const occurrence = at(discover.occurrences, position);
        const attempt = await graph.study.startAttempt(
          occurrence.card.id,
          position,
          discover.studySessionId
        );
        await graph.study.rateAttempt(attempt, position === 0 ? "hard" : "easy");
      })
    );
    await graph.study.updateSessionReelPosition(discover.studySessionId, 4);
    const positions = (await graph.items.listBySessionId(discover.studySessionId)).map(
      (item) => item.reelPosition
    );
    expect(positions).toEqual([0, 1, 2, 3, 4, 5]);
    graph = createScenarioGraph(database, clock, ids);
    const resumed = await graph.feed.prepareFeed(allCards, "mixed", null, false);
    expect(resumed.studySessionId).toBe(discover.studySessionId);
    expect(resumed.currentReelPosition).toBe(4);
    const focus = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    await graph.feed.prepareFeed(otherCards, "focused", OTHER_DECK_ID, false);
    expect((await graph.sessions.findById(focus.studySessionId))?.completedAt).not.toBeNull();
    expect((await graph.sessions.findById(discover.studySessionId))?.completedAt).toBeNull();
    await graph.study.completeSession(discover.studySessionId);
    expect(
      await database.getFirstAsync("SELECT SUM(review_count) AS count FROM learner_profiles")
    ).toEqual({ count: 2 });
  });

  it("persists only the corrected final rating and cancels its recurrence", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const attempt = await graph.study.startAttempt(
      at(feed.occurrences, 0).card.id,
      0,
      feed.studySessionId
    );
    await graph.study.rateAttempt(attempt, "again");
    expect(await graph.recurrences.listBySessionId(feed.studySessionId)).toHaveLength(1);
    await graph.study.rateAttempt(attempt, "good");
    expect(await graph.recurrences.listBySessionId(feed.studySessionId)).toHaveLength(0);
    await graph.study.completeSession(feed.studySessionId);
    graph = createScenarioGraph(database, clock, ids);
    expect(
      await database.getFirstAsync(
        "SELECT review_count, again_count, good_count FROM learner_profiles WHERE flashcard_id = ?",
        at(feed.occurrences, 0).card.id
      )
    ).toEqual({ again_count: 0, good_count: 1, review_count: 1 });
  });

  it("keeps pre-reset attempts behind the reset boundary", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const cardId = at(feed.occurrences, 0).card.id;
    const beforeReset = await graph.study.startAttempt(cardId, 0, feed.studySessionId);
    await graph.study.rateAttempt(beforeReset, "again");
    await graph.learnerProfiles.resetCardProgress(cardId);
    await graph.study.finalizeAttempt(beforeReset);
    const afterReset = await graph.study.startAttempt(cardId, 1, feed.studySessionId);
    await graph.study.rateAttempt(afterReset, "easy");
    await graph.study.completeSession(feed.studySessionId);
    graph = createScenarioGraph(database, clock, ids);
    expect(
      await database.getFirstAsync(
        "SELECT review_count, again_count, easy_count, reset_at FROM learner_profiles WHERE flashcard_id = ?",
        cardId
      )
    ).toMatchObject({ again_count: 0, easy_count: 1, review_count: 1 });
  });
});
