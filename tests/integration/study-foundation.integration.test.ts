import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { learnerProfiles } from "@/infrastructure/sqlite/schema";
import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/domain/review-attempts";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  createScenarioGraph,
  seedDeck,
  type ScenarioGraph,
} from "../support/sqlite-study-scenario";
import {
  OTHER_DECK_ID,
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  testId,
} from "../support/study-test-support";

function cards(deckId: string, count: number, firstId: number): Flashcard[] {
  return Array.from(
    { length: count },
    (_, position) =>
      new Flashcard({
        answer: `Answer ${position}`,
        createdAt: "2026-01-01T00:00:00.000Z",
        deckId,
        order: position,
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

  it("preserves a Focus journey through recurrence, aggregation, and restart", async () => {
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
    const materializedItems = await graph.items.listBySessionId(opened.studySessionId);
    expect(materializedItems.slice(0, 6).map((x) => x.flashcardId)).toEqual(originalHistory);
    expect(materializedItems.some((x) => x.reelPosition === 6)).toBe(false);

    await graph.study.updateSessionReelPosition(opened.studySessionId, 6);
    const atRecurrence = await graph.feed.refreshFeed(focusCards, opened.studySessionId);
    expect(atRecurrence.occurrences.find((item) => item.reelPosition === 6)).toMatchObject({
      card: { id: at(opened.occurrences, 0).card.id },
      recurrenceId: recurrence.id,
    });
    await graph.study.consumeRecurrence(recurrence.id);
    await graph.study.updateSessionReelPosition(opened.studySessionId, 126);
    await graph.study.finalizeAttemptsOutsideEditableWindow(opened.studySessionId);

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
    const resumedItems = await graph.items.listBySessionId(opened.studySessionId);
    expect(resumedItems.slice(0, storedItems.length)).toEqual(storedItems);
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_session_recurrences")
    ).toEqual({ count: 1 });
    expect(
      await database.getFirstAsync("SELECT SUM(review_count) AS count FROM learner_profiles")
    ).toEqual({ count: 2 });
  });

  it("compacts durable session history without removing review attempts or pending recurrences", async () => {
    const opened = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const firstCard = at(focusCards, 0);
    const pendingCard = at(focusCards, 1);
    const firstAttempt = await graph.study.startAttempt(firstCard.id, 0, opened.studySessionId);
    const pendingAttempt = await graph.study.startAttempt(pendingCard.id, 1, opened.studySessionId);
    await graph.study.rateAttempt(firstAttempt, "again");
    await graph.study.rateAttempt(pendingAttempt, "again");

    const recurrencesBefore = await graph.recurrences.listBySessionId(opened.studySessionId);
    const consumedRecurrence = recurrencesBefore.find(
      (recurrence) => recurrence.sourceAttemptId === firstAttempt
    );
    const pendingRecurrence = recurrencesBefore.find(
      (recurrence) => recurrence.sourceAttemptId === pendingAttempt
    );
    if (!consumedRecurrence || !pendingRecurrence) {
      throw new Error("Expected both recurrence fixtures");
    }
    await graph.study.consumeRecurrence(consumedRecurrence.id);

    await graph.study.appendSessionItems(
      opened.studySessionId,
      Array.from({ length: 125 }, () => at(focusCards, 2)),
      JSON.stringify({ recentCardIds: [] }),
      6,
      Array.from({ length: 125 }, (_, index) => index + 6)
    );
    await graph.study.updateSessionReelPosition(opened.studySessionId, 125);
    await graph.study.compactSessionRuntimeData(opened.studySessionId, 160);

    const itemsAfterCompaction = await graph.items.listBySessionId(opened.studySessionId);
    expect(itemsAfterCompaction.every((item) => item.reelPosition >= 25)).toBe(true);
    const firstAttemptAfterCompaction = await graph.attempts.findById(firstAttempt);
    const pendingAttemptAfterCompaction = await graph.attempts.findById(pendingAttempt);
    expect(firstAttemptAfterCompaction).not.toBeNull();
    expect(pendingAttemptAfterCompaction).not.toBeNull();
    const recurrencesAfter = await graph.recurrences.listBySessionId(opened.studySessionId);
    expect(recurrencesAfter.some((recurrence) => recurrence.id === consumedRecurrence.id)).toBe(
      false
    );
    expect(recurrencesAfter.some((recurrence) => recurrence.id === pendingRecurrence.id)).toBe(
      true
    );
  });

  it("keeps feed selection independent from learner-profile counters", async () => {
    const initial = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const initialIds = initial.occurrences.map((occurrence) => occurrence.card.id);
    await database.drizzle.insert(learnerProfiles).values(
      focusCards.map((card) => ({
        againCount: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        easyCount: 0,
        firstReviewedAt: "2026-01-01T00:00:00.000Z",
        flashcardId: card.id,
        goodCount: 0,
        hardCount: 0,
        lastReviewedAt: "2026-01-01T00:00:00.000Z",
        reviewCount: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }))
    );

    const changedProfile = createScenarioGraph(database, clock, ids);
    const afterProfileChange = await changedProfile.feed.prepareFeed(
      focusCards,
      "focused",
      TEST_DECK_ID,
      true
    );

    expect(afterProfileChange.occurrences.map((occurrence) => occurrence.card.id)).toEqual(
      initialIds
    );
  });

  it("preserves Focus expiry, replacement, and bounded completed recovery", async () => {
    const first = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    expect(first.occurrences).toHaveLength(6);
    await graph.study.updateSessionReelPosition(first.studySessionId, 7);
    await graph.feed.extendFeed(focusCards, first.studySessionId);
    await graph.feed.refreshFeed(focusCards, first.studySessionId);
    graph = createScenarioGraph(database, clock, ids);
    const resumed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    expect(resumed.studySessionId).toBe(first.studySessionId);

    const attemptId = await graph.study.startAttempt(at(focusCards, 0).id, 0, first.studySessionId);
    await graph.study.rateAttempt(attemptId, "easy");
    clock.advance(FOCUS_SESSION_INACTIVITY_TIMEOUT_MS);
    const expiredReplacement = await graph.feed.prepareFeed(
      focusCards,
      "focused",
      TEST_DECK_ID,
      false
    );
    expect(expiredReplacement.studySessionId).not.toBe(first.studySessionId);
    const expiredSession = await graph.sessions.findById(first.studySessionId);
    expect(expiredSession?.completedAt).not.toBeNull();
    const other = await graph.feed.prepareFeed(otherCards, "focused", OTHER_DECK_ID, false);
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
    const aggregatedSession = await graph.sessions.findById(first.studySessionId);
    expect(aggregatedSession?.aggregatedThroughReelPosition).toBe(0);
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
    const materializedItems = await graph.items.listBySessionId(discover.studySessionId);
    const positions = materializedItems.map((item) => item.reelPosition);
    expect(positions).toEqual([0, 1, 2, 3, 4, 5]);
    graph = createScenarioGraph(database, clock, ids);
    const resumed = await graph.feed.prepareFeed(allCards, "mixed", null, false);
    expect(resumed.studySessionId).toBe(discover.studySessionId);
    expect(resumed.currentReelPosition).toBe(4);
    const focus = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    await graph.feed.prepareFeed(otherCards, "focused", OTHER_DECK_ID, false);
    const completedFocus = await graph.sessions.findById(focus.studySessionId);
    const activeDiscover = await graph.sessions.findById(discover.studySessionId);
    expect(completedFocus?.completedAt).not.toBeNull();
    expect(activeDiscover?.completedAt).toBeNull();
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
    const memoryState = await graph.memoryStates.findByFlashcardId(at(feed.occurrences, 0).card.id);
    expect(memoryState).toMatchObject({ lapses: 0, reps: 1 });
    expect(typeof memoryState?.lastReviewAt).toBe("string");
  });

  it("keeps Again immediate and applies its long-term memory transition on finalization", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const cardId = at(feed.occurrences, 0).card.id;
    const attempt = await graph.study.startAttempt(cardId, 0, feed.studySessionId);

    await graph.study.rateAttempt(attempt, "again");

    expect(await graph.recurrences.listBySessionId(feed.studySessionId)).toHaveLength(1);
    expect(await graph.memoryStates.findByFlashcardId(cardId)).toBeNull();

    await graph.study.completeSession(feed.studySessionId);

    const memoryState = await graph.memoryStates.findByFlashcardId(cardId);
    expect(memoryState).toMatchObject({ reps: 1 });
    expect(typeof memoryState?.lastReviewAt).toBe("string");
    expect(memoryState?.state).not.toBe("new");
  });

  it("finalizes a swipe without rating as a skip outside the editable window", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const cardId = at(feed.occurrences, 0).card.id;
    const attemptId = await graph.study.startAttempt(cardId, 0, feed.studySessionId);

    await graph.study.updateSessionReelPosition(feed.studySessionId, 5);
    await graph.study.finalizeAttemptsOutsideEditableWindow(feed.studySessionId);

    const attempt = await graph.attempts.findById(attemptId);
    expect(attempt?.finalizedAt).not.toBeNull();
    expect(attempt?.rating).toBeNull();
    expect(attempt?.ratedAt).toBeNull();
    expect(await graph.memoryStates.findByFlashcardId(cardId)).toBeNull();
    expect(await graph.profiles.findByFlashcardId(cardId)).toBeNull();
    expect(await graph.recurrences.listBySessionId(feed.studySessionId)).toHaveLength(0);
  });

  it("allows a skipped reel to become a rated review while it remains editable", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const cardId = at(feed.occurrences, 0).card.id;
    const attemptId = await graph.study.startAttempt(cardId, 0, feed.studySessionId);

    await graph.study.updateSessionReelPosition(feed.studySessionId, 2);
    expect(await graph.study.startAttempt(cardId, 0, feed.studySessionId)).toBe(attemptId);
    expect(await graph.memoryStates.findByFlashcardId(cardId)).toBeNull();
    await graph.study.rateAttempt(attemptId, "good");
    await graph.study.completeSession(feed.studySessionId);

    const attempt = await graph.attempts.findById(attemptId);
    expect(attempt).toMatchObject({ rating: "good" });
    expect(typeof attempt?.ratedAt).toBe("string");
    expect(await graph.memoryStates.findByFlashcardId(cardId)).toMatchObject({ reps: 1 });
    expect(await graph.profiles.findByFlashcardId(cardId)).toMatchObject({
      goodCount: 1,
      reviewCount: 1,
    });
  });

  it("keeps an unrated attempt as a skip when the session completes", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const cardId = at(feed.occurrences, 0).card.id;
    const attemptId = await graph.study.startAttempt(cardId, 0, feed.studySessionId);

    await graph.study.completeSession(feed.studySessionId);

    const attempt = await graph.attempts.findById(attemptId);
    expect(attempt?.finalizedAt).not.toBeNull();
    expect(attempt?.rating).toBeNull();
    expect(attempt?.ratedAt).toBeNull();
    expect(await graph.memoryStates.findByFlashcardId(cardId)).toBeNull();
    expect(await graph.profiles.findByFlashcardId(cardId)).toBeNull();
  });

  it("rejects review attempts after a session completes", async () => {
    const feed = await graph.feed.prepareFeed(focusCards, "focused", TEST_DECK_ID, false);
    const cardId = at(feed.occurrences, 0).card.id;

    await graph.study.completeSession(feed.studySessionId);

    await expect(graph.study.startAttempt(cardId, 0, feed.studySessionId)).rejects.toThrow(
      "inactive session"
    );
    expect(await graph.attempts.findBySessionAndReelPosition(feed.studySessionId, 0)).toBeNull();
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
