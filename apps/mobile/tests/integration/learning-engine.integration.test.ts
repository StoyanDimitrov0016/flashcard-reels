import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { FlashcardMemoryState } from "@/features/learning-engine/domain/flashcard-memory-state";
import type { FlashcardMemoryStateRepository } from "@/features/learning-engine/domain/flashcard-memory-state.repository";
import type { ReviewAttemptCommitTransaction } from "@/features/study/application/review-attempt-commit-transaction";

import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";
import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { completeReelActivation } from "@/features/reels/application/reel-position-extension";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import { SQLiteReviewAttemptCommitTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-commit-transaction";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import { decks, flashcards } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph } from "../support/sqlite-study-scenario";
import {
  SequenceIdGenerator,
  TEST_DECK_ID,
  TestClock,
  makeFlashcard,
  makeSession,
  testId,
} from "../support/study-fixtures";

const RATED_AT_AGAIN = "2026-01-01T00:01:00.000Z";
const RATED_AT_HARD = "2026-01-01T00:02:00.000Z";
const COMMITTED_AT = "2026-01-01T00:03:00.000Z";

describe("SQLite learning-engine commit", () => {
  let database: NodeSqliteDatabase;
  let attempts: SQLiteReviewAttemptRepository;
  let commit: SQLiteReviewAttemptCommitTransaction;
  let memoryStates: SQLiteFlashcardMemoryStateRepository;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    const card = makeFlashcard(1);
    await database.drizzle.insert(decks).values({
      authorId: "00000000-0000-4000-8000-000000000001",
      packageSchema: 1,
      revision: 1,

      createdAt: RATED_AT_AGAIN,
      description: "Test deck",
      id: TEST_DECK_ID,
      title: "Test deck",
      updatedAt: RATED_AT_AGAIN,
    });
    await database.drizzle.insert(flashcards).values({
      answer: card.answer,
      createdAt: card.createdAt,
      deckId: card.deckId,
      id: card.id,
      order: card.order,
      question: card.question,
      updatedAt: card.updatedAt,
    });
    await new SQLiteStudySessionRepository(database.drizzle).create(
      makeSession(testId(900), "discover")
    );
    attempts = new SQLiteReviewAttemptRepository(database.drizzle);
    memoryStates = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
    commit = new SQLiteReviewAttemptCommitTransaction(
      database.drizzle,
      createLearningScheduler(),
      database.rowIds
    );
  });

  afterEach(() => {
    database.close();
  });

  it("keeps editable ratings out of memory until commit and applies only the final rating", async () => {
    const attempt = await createAttempt(901);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);

    await rating.rateAttempt(attempt.id, "again", RATED_AT_AGAIN, null, null);
    await rating.rateAttempt(attempt.id, "hard", RATED_AT_HARD, null, null);

    expect(await memoryStates.findByFlashcardId(attempt.flashcardId)).toBeNull();

    await expect(commit.commitAttempt(attempt.id, COMMITTED_AT, COMMITTED_AT)).resolves.toBe(true);
    const state = await memoryStates.findByFlashcardId(attempt.flashcardId);
    expect(state).toMatchObject({
      flashcardId: attempt.flashcardId,
      lastReviewAt: RATED_AT_HARD,
      reps: 1,
      lapses: 0,
    });
    const committedAttempt = await attempts.findById(attempt.id);
    expect(committedAttempt?.committedAt).toBe(COMMITTED_AT);
  });

  it("does not create memory for an unrated attempt", async () => {
    const attempt = await createAttempt(902);

    await expect(commit.commitAttempt(attempt.id, COMMITTED_AT, COMMITTED_AT)).resolves.toBe(true);

    expect(await memoryStates.findByFlashcardId(attempt.flashcardId)).toBeNull();
    const committedAttempt = await attempts.findById(attempt.id);
    expect(committedAttempt?.committedAt).toBe(COMMITTED_AT);
  });

  it("is idempotent and preserves all persisted FSRS fields across reconstruction", async () => {
    const attempt = await createAttempt(903);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(attempt.id, "good", RATED_AT_AGAIN, null, null);

    await expect(commit.commitAttempt(attempt.id, COMMITTED_AT, COMMITTED_AT)).resolves.toBe(true);
    const first = await memoryStates.findByFlashcardId(attempt.flashcardId);
    await expect(
      commit.commitAttempt(attempt.id, "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z")
    ).resolves.toBe(false);

    const reconstructed = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
    expect(await reconstructed.findByFlashcardId(attempt.flashcardId)).toEqual(first);
    expect(first?.reps).toBe(1);
  });

  it("commits rated attempts when a study session completes", async () => {
    const attempt = await createAttempt(904);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(attempt.id, "easy", RATED_AT_AGAIN, null, null);

    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    await graph.study.completeSession(testId(900));

    expect(await memoryStates.findByFlashcardId(attempt.flashcardId)).toMatchObject({
      lastReviewAt: RATED_AT_AGAIN,
      reps: 1,
    });
    const committedAttempt = await attempts.findById(attempt.id);
    expect(committedAttempt?.committedAt).not.toBeNull();
  });

  it("carries a committed Again into the next FSRS lapse transition", async () => {
    const firstAttempt = await createAttempt(905);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(firstAttempt.id, "good", RATED_AT_AGAIN, null, null);
    await commit.commitAttempt(firstAttempt.id, COMMITTED_AT, COMMITTED_AT);

    const secondAttempt = await createAttempt(906);
    await rating.rateAttempt(secondAttempt.id, "again", "2026-01-02T00:01:00.000Z", null, null);
    await commit.commitAttempt(
      secondAttempt.id,
      "2026-01-02T00:02:00.000Z",
      "2026-01-02T00:02:00.000Z"
    );

    expect(await memoryStates.findByFlashcardId(firstAttempt.flashcardId)).toMatchObject({
      lapses: 1,
      lastReviewAt: "2026-01-02T00:01:00.000Z",
      reps: 2,
    });
  });

  it("counts a same-day recurrence without rescheduling memory, then learns again the next day", async () => {
    const clock = new TestClock();
    clock.advance(new Date(2026, 0, 10, 12).getTime() - Date.parse("2026-01-01T00:00:00.000Z"));
    const graph = createScenarioGraph(database, clock, new SequenceIdGenerator(), () => 0.5);
    const firstAttempt = await graph.study.startAttempt(makeFlashcard(1).id, 0, testId(900));
    await graph.study.rateAttempt(firstAttempt, "again");
    const firstRating = await attempts.findById(firstAttempt);
    const firstRatedAt = firstRating?.ratedAt;
    expect(firstRatedAt).not.toBeNull();
    await graph.study.updateSessionReelPosition(testId(900), 5);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));
    const firstState = await memoryStates.findByFlashcardId(makeFlashcard(1).id);
    expect(firstState?.lastReviewAt).toBe(firstRatedAt);
    expect(Date.parse(firstState?.dueAt ?? "") - Date.parse(firstRatedAt ?? "")).toBeCloseTo(
      24 * 60 * 60 * 1000,
      -5
    );

    const scheduledRecurrences = await graph.recurrences.listBySessionId(testId(900));
    const scheduledRecurrence = scheduledRecurrences[0];
    if (!scheduledRecurrence) {
      throw new Error("Expected an Again recurrence");
    }
    expect(scheduledRecurrence).toMatchObject({
      flashcardId: makeFlashcard(1).id,
      targetReelPosition: 8,
    });
    const recurrenceAttempt = await graph.study.startAttempt(makeFlashcard(1).id, 8, testId(900));
    await graph.study.rateAttempt(recurrenceAttempt, "good");
    await graph.study.consumeRecurrence(scheduledRecurrence.id);
    await graph.study.updateSessionReelPosition(testId(900), 13);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));

    expect(await memoryStates.findByFlashcardId(makeFlashcard(1).id)).toEqual(firstState);
    expect(
      await database.getAllAsync("SELECT rating FROM flashcard_review_events ORDER BY reviewed_at")
    ).toEqual([{ rating: "again" }, { rating: "good" }]);

    clock.advance(24 * 60 * 60 * 1000);
    const nextDayAttempt = await graph.study.startAttempt(makeFlashcard(1).id, 16, testId(900));
    await graph.study.rateAttempt(nextDayAttempt, "good");
    const nextDayRating = await attempts.findById(nextDayAttempt);
    const nextDayRatedAt = nextDayRating?.ratedAt;
    await graph.study.completeSession(testId(900));

    expect(await memoryStates.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      lastReviewAt: nextDayRatedAt,
      reps: 2,
    });
    expect(
      await database.getAllAsync("SELECT rating FROM flashcard_review_events ORDER BY reviewed_at")
    ).toEqual([{ rating: "again" }, { rating: "good" }, { rating: "good" }]);
    expect(
      await database.getFirstAsync(
        "SELECT review_count, again_count, good_count FROM flashcard_progress WHERE flashcard_id = ?",
        makeFlashcard(1).id
      )
    ).toEqual({ review_count: 3, again_count: 1, good_count: 2 });
  });

  it("applies repeated reviews in ratedAt order rather than reel order", async () => {
    const earlierReelAttempt = await createAttempt(907, 0);
    const laterReelAttempt = await createAttempt(908, 1);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    const laterRatingAt = "2026-01-01T00:01:00.000Z";
    const earlierRatingAt = "2026-01-01T00:02:00.000Z";

    await rating.rateAttempt(laterReelAttempt.id, "good", laterRatingAt, null, null);
    await rating.rateAttempt(earlierReelAttempt.id, "again", earlierRatingAt, null, null);

    const scheduler = createLearningScheduler();
    const firstExpected = scheduler.review(
      earlierReelAttempt.flashcardId,
      null,
      "good",
      laterRatingAt
    ).memoryState;
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));

    const actual = await memoryStates.findByFlashcardId(earlierReelAttempt.flashcardId);
    expect(actual).toMatchObject(firstExpected);
    expect(actual?.reps).toBe(1);
    expect(actual?.lastReviewAt).toBe(laterRatingAt);
  });

  it("keeps session-completion reviews chronological across three attempts", async () => {
    const firstReelAttempt = await createAttempt(909, 0);
    const secondReelAttempt = await createAttempt(910, 1);
    const thirdReelAttempt = await createAttempt(911, 2);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    const firstRatingAt = "2026-01-01T00:01:00.000Z";
    const secondRatingAt = "2026-01-01T00:02:00.000Z";
    const thirdRatingAt = "2026-01-01T00:03:00.000Z";

    await rating.rateAttempt(thirdReelAttempt.id, "good", firstRatingAt, null, null);
    await rating.rateAttempt(firstReelAttempt.id, "hard", secondRatingAt, null, null);
    await rating.rateAttempt(secondReelAttempt.id, "easy", thirdRatingAt, null, null);

    const scheduler = createLearningScheduler();
    const afterGood = scheduler.review(
      firstReelAttempt.flashcardId,
      null,
      "good",
      firstRatingAt
    ).memoryState;
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());

    await graph.study.completeSession(testId(900));

    const actual = await memoryStates.findByFlashcardId(firstReelAttempt.flashcardId);
    expect(actual).toMatchObject(afterGood);
    expect(actual?.reps).toBe(1);
    expect(actual?.lastReviewAt).toBe(firstRatingAt);
  });

  it("defers a cross-window review until an earlier same-card review is eligible", async () => {
    const earlierReelAttempt = await createAttempt(912, 0);
    const laterReelAttempt = await createAttempt(913, 1);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    const laterRatingAt = "2026-01-01T00:01:00.000Z";
    const earlierRatingAt = "2026-01-01T00:02:00.000Z";

    await rating.rateAttempt(laterReelAttempt.id, "good", laterRatingAt, null, null);
    await rating.rateAttempt(earlierReelAttempt.id, "again", earlierRatingAt, null, null);

    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    await graph.study.updateSessionReelPosition(testId(900), 5);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));

    const earlierAttemptAfterFirstPass = await attempts.findById(earlierReelAttempt.id);
    expect(earlierAttemptAfterFirstPass?.committedAt).toBeNull();
    expect(await memoryStates.findByFlashcardId(earlierReelAttempt.flashcardId)).toBeNull();

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));

    const scheduler = createLearningScheduler();
    const afterLaterReview = scheduler.review(
      earlierReelAttempt.flashcardId,
      null,
      "good",
      laterRatingAt
    ).memoryState;
    const actual = await memoryStates.findByFlashcardId(earlierReelAttempt.flashcardId);

    expect(actual).toMatchObject(afterLaterReview);
    const laterAttemptAfterSecondPass = await attempts.findById(laterReelAttempt.id);
    const earlierAttemptAfterSecondPass = await attempts.findById(earlierReelAttempt.id);
    expect(laterAttemptAfterSecondPass?.committedAt).not.toBeNull();
    expect(earlierAttemptAfterSecondPass?.committedAt).not.toBeNull();
  });

  it("commits concurrent activation work serially without duplicate scheduler application", async () => {
    const firstAttempt = await createAttempt(914, 0);
    const secondAttempt = await createAttempt(915, 1);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(firstAttempt.id, "good", "2026-01-01T00:01:00.000Z", null, null);
    await rating.rateAttempt(secondAttempt.id, "hard", "2026-01-01T00:02:00.000Z", null, null);
    const trackingCommit = new TrackingCommitTransaction(
      new SQLiteReviewAttemptCommitTransaction(
        database.drizzle,
        createLearningScheduler(),
        database.rowIds
      )
    );
    const graph = createScenarioGraph(
      database,
      new TestClock(),
      new SequenceIdGenerator(),
      () => 0,
      trackingCommit
    );

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await Promise.all([
      graph.study.commitAttemptsOutsideEditableWindow(testId(900)),
      graph.study.commitAttemptsOutsideEditableWindow(testId(900)),
    ]);

    const state = await memoryStates.findByFlashcardId(firstAttempt.flashcardId);
    expect(state?.reps).toBe(1);
    expect(state?.lastReviewAt).toBe("2026-01-01T00:01:00.000Z");
    expect(trackingCommit.maximumConcurrentCalls).toBe(1);
    expect(trackingCommit.committedAttemptIds).toEqual([firstAttempt.id, secondAttempt.id]);
    const committedFirstAttempt = await attempts.findById(firstAttempt.id);
    const committedSecondAttempt = await attempts.findById(secondAttempt.id);
    expect(committedFirstAttempt?.committedAt).not.toBeNull();
    expect(committedSecondAttempt?.committedAt).not.toBeNull();
  });

  it("commits memory before feed extension reads candidates", async () => {
    const card = makeFlashcard(1);
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    const observedStates: Array<FlashcardMemoryState | null> = [];
    const recordingMemoryStates: FlashcardMemoryStateRepository = {
      findByFlashcardId: (flashcardId) => graph.memoryStates.findByFlashcardId(flashcardId),
      findByFlashcardIds: async (flashcardIds) => {
        const states = await graph.memoryStates.findByFlashcardIds(flashcardIds);
        observedStates.push(states.get(card.id) ?? null);
        return states;
      },
    };
    const feed = new ReelFeedServiceImpl(
      graph.study,
      recordingMemoryStates,
      createLearningScheduler(),
      new TestClock(),
      () => 0
    );
    const prepared = await feed.prepareFeed([card], "discover", null, false, null);
    const attemptId = await graph.study.startAttempt(card.id, 0, prepared.studySessionId);
    await graph.study.rateAttempt(attemptId, "good");

    await completeReelActivation(
      async () =>
        (await graph.study.updateSessionReelPosition(prepared.studySessionId, 5)) !== null,
      async () => undefined,
      () => feed.recordVisibleCard(prepared.studySessionId, card.id),
      () => graph.study.commitAttemptsOutsideEditableWindow(prepared.studySessionId),
      () => graph.study.compactSessionRuntimeData(prepared.studySessionId, 0),
      async () => {
        await feed.extendFeed([card], prepared.studySessionId);
      }
    );

    expect(observedStates.at(-1)).not.toBeNull();
  });

  it("lets an unrated skip commit without blocking a rated review", async () => {
    const skippedAttempt = await createAttempt(916, 0);
    const ratedAttempt = await createAttempt(917, 1);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(ratedAttempt.id, "good", "2026-01-01T00:01:00.000Z", null, null);
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());

    await graph.study.updateSessionReelPosition(testId(900), 5);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));
    const skippedAttemptAfterFirstPass = await attempts.findById(skippedAttempt.id);
    const ratedAttemptAfterFirstPass = await attempts.findById(ratedAttempt.id);
    expect(skippedAttemptAfterFirstPass?.committedAt).not.toBeNull();
    expect(ratedAttemptAfterFirstPass?.committedAt).toBeNull();

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await graph.study.commitAttemptsOutsideEditableWindow(testId(900));
    const ratedAttemptAfterSecondPass = await attempts.findById(ratedAttempt.id);
    expect(ratedAttemptAfterSecondPass?.committedAt).not.toBeNull();
    expect(await memoryStates.findByFlashcardId(ratedAttempt.flashcardId)).toMatchObject({
      reps: 1,
    });
  });

  async function createAttempt(
    index: number,
    reelPosition = index
  ): Promise<FlashcardReviewAttempt> {
    const attempt = new FlashcardReviewAttempt({
      createdAt: RATED_AT_AGAIN,
      committedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(index),
      rating: null,
      ratedAt: null,
      reelPosition,
      studySessionId: testId(900),
      updatedAt: RATED_AT_AGAIN,
    });
    await new SQLiteReviewAttemptTransaction(database.drizzle).createAttempt(attempt);
    return attempt;
  }
});

class TrackingCommitTransaction implements ReviewAttemptCommitTransaction {
  private activeCalls = 0;
  private readonly delegate: ReviewAttemptCommitTransaction;
  maximumConcurrentCalls = 0;
  readonly committedAttemptIds: string[] = [];

  constructor(delegate: ReviewAttemptCommitTransaction) {
    this.delegate = delegate;
  }

  async commitAttempt(attemptId: string, committedAt: string, updatedAt: string): Promise<boolean> {
    this.activeCalls += 1;
    this.maximumConcurrentCalls = Math.max(this.maximumConcurrentCalls, this.activeCalls);
    await Promise.resolve();
    try {
      const committed = await this.delegate.commitAttempt(attemptId, committedAt, updatedAt);
      if (committed) {
        this.committedAttemptIds.push(attemptId);
      }
      return committed;
    } finally {
      this.activeCalls -= 1;
    }
  }
}
