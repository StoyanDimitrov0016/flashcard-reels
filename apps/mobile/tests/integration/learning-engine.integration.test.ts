import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { FlashcardMemoryStateRepository } from "@/features/learning-engine/domain/flashcard-memory-state.repository";
import type {
  LearnerMemoryState,
  SchedulerMemoryState,
} from "@/features/learning-engine/domain/memory-state";
import type { ReviewAttemptFinalizationTransaction } from "@/features/study/application/review-attempt-finalization-transaction";

import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";
import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { completeReelActivation } from "@/features/reels/application/reel-position-extension";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
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
const FINALIZED_AT = "2026-01-01T00:03:00.000Z";

describe("SQLite learning-engine finalization", () => {
  let database: NodeSqliteDatabase;
  let attempts: SQLiteReviewAttemptRepository;
  let finalization: SQLiteReviewAttemptFinalizationTransaction;
  let memoryStates: SQLiteFlashcardMemoryStateRepository;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    const card = makeFlashcard(1);
    await database.drizzle.insert(decks).values({
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
      makeSession(testId(900), "mixed")
    );
    attempts = new SQLiteReviewAttemptRepository(database.drizzle);
    memoryStates = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
    finalization = new SQLiteReviewAttemptFinalizationTransaction(
      database.drizzle,
      createLearningScheduler()
    );
  });

  afterEach(() => {
    database.close();
  });

  it("keeps editable ratings out of memory until finalization and applies only the final rating", async () => {
    const attempt = await createAttempt(901);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);

    await rating.rateAttempt(attempt.id, "again", RATED_AT_AGAIN, null, null);
    await rating.rateAttempt(attempt.id, "hard", RATED_AT_HARD, null, null);

    expect(await memoryStates.findByFlashcardId(attempt.flashcardId)).toBeNull();

    await expect(
      finalization.finalizeAttempt(attempt.id, FINALIZED_AT, FINALIZED_AT)
    ).resolves.toBe(true);
    const state = await memoryStates.findByFlashcardId(attempt.flashcardId);
    expect(state).toMatchObject({
      flashcardId: attempt.flashcardId,
      lastReviewAt: RATED_AT_HARD,
      reps: 1,
      lapses: 0,
    });
    const finalizedAttempt = await attempts.findById(attempt.id);
    expect(finalizedAttempt?.finalizedAt).toBe(FINALIZED_AT);
  });

  it("does not create memory for an unrated attempt", async () => {
    const attempt = await createAttempt(902);

    await expect(
      finalization.finalizeAttempt(attempt.id, FINALIZED_AT, FINALIZED_AT)
    ).resolves.toBe(true);

    expect(await memoryStates.findByFlashcardId(attempt.flashcardId)).toBeNull();
    const finalizedAttempt = await attempts.findById(attempt.id);
    expect(finalizedAttempt?.finalizedAt).toBe(FINALIZED_AT);
  });

  it("is idempotent and preserves all persisted FSRS fields across reconstruction", async () => {
    const attempt = await createAttempt(903);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(attempt.id, "good", RATED_AT_AGAIN, null, null);

    await expect(
      finalization.finalizeAttempt(attempt.id, FINALIZED_AT, FINALIZED_AT)
    ).resolves.toBe(true);
    const first = await memoryStates.findByFlashcardId(attempt.flashcardId);
    await expect(
      finalization.finalizeAttempt(
        attempt.id,
        "2026-01-02T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z"
      )
    ).resolves.toBe(false);

    const reconstructed = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
    expect(await reconstructed.findByFlashcardId(attempt.flashcardId)).toEqual(first);
    expect(first?.reps).toBe(1);
  });

  it("finalizes rated attempts when a study session completes", async () => {
    const attempt = await createAttempt(904);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(attempt.id, "easy", RATED_AT_AGAIN, null, null);

    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    await graph.study.completeSession(testId(900));

    expect(await memoryStates.findByFlashcardId(attempt.flashcardId)).toMatchObject({
      lastReviewAt: RATED_AT_AGAIN,
      reps: 1,
    });
    const finalizedAttempt = await attempts.findById(attempt.id);
    expect(finalizedAttempt?.finalizedAt).not.toBeNull();
  });

  it("carries a finalized Again into the next FSRS lapse transition", async () => {
    const firstAttempt = await createAttempt(905);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(firstAttempt.id, "good", RATED_AT_AGAIN, null, null);
    await finalization.finalizeAttempt(firstAttempt.id, FINALIZED_AT, FINALIZED_AT);

    const secondAttempt = await createAttempt(906);
    await rating.rateAttempt(secondAttempt.id, "again", "2026-01-02T00:01:00.000Z", null, null);
    await finalization.finalizeAttempt(
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
    const expected = scheduler.review(
      earlierReelAttempt.flashcardId,
      withPersistence(firstExpected),
      "again",
      earlierRatingAt
    ).memoryState;
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await graph.study.finalizeAttemptsOutsideEditableWindow(testId(900));

    const actual = await memoryStates.findByFlashcardId(earlierReelAttempt.flashcardId);
    expect(actual).toMatchObject(expected);
    expect(actual?.reps).toBe(2);
    expect(actual?.lastReviewAt).toBe(earlierRatingAt);
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
    const afterHard = scheduler.review(
      firstReelAttempt.flashcardId,
      withPersistence(afterGood),
      "hard",
      secondRatingAt
    ).memoryState;
    const expected = scheduler.review(
      firstReelAttempt.flashcardId,
      withPersistence(afterHard),
      "easy",
      thirdRatingAt
    ).memoryState;
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());

    await graph.study.completeSession(testId(900));

    const actual = await memoryStates.findByFlashcardId(firstReelAttempt.flashcardId);
    expect(actual).toMatchObject(expected);
    expect(actual?.reps).toBe(3);
    expect(actual?.lastReviewAt).toBe(thirdRatingAt);
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
    await graph.study.finalizeAttemptsOutsideEditableWindow(testId(900));

    const earlierAttemptAfterFirstPass = await attempts.findById(earlierReelAttempt.id);
    expect(earlierAttemptAfterFirstPass?.finalizedAt).toBeNull();
    expect(await memoryStates.findByFlashcardId(earlierReelAttempt.flashcardId)).toBeNull();

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await graph.study.finalizeAttemptsOutsideEditableWindow(testId(900));

    const scheduler = createLearningScheduler();
    const afterLaterReview = scheduler.review(
      earlierReelAttempt.flashcardId,
      null,
      "good",
      laterRatingAt
    ).memoryState;
    const expected = scheduler.review(
      earlierReelAttempt.flashcardId,
      withPersistence(afterLaterReview),
      "again",
      earlierRatingAt
    ).memoryState;
    const actual = await memoryStates.findByFlashcardId(earlierReelAttempt.flashcardId);

    expect(actual).toMatchObject(expected);
    const laterAttemptAfterSecondPass = await attempts.findById(laterReelAttempt.id);
    const earlierAttemptAfterSecondPass = await attempts.findById(earlierReelAttempt.id);
    expect(laterAttemptAfterSecondPass?.finalizedAt).not.toBeNull();
    expect(earlierAttemptAfterSecondPass?.finalizedAt).not.toBeNull();
  });

  it("finalizes concurrent activation work serially without duplicate scheduler application", async () => {
    const firstAttempt = await createAttempt(914, 0);
    const secondAttempt = await createAttempt(915, 1);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(firstAttempt.id, "good", "2026-01-01T00:01:00.000Z", null, null);
    await rating.rateAttempt(secondAttempt.id, "hard", "2026-01-01T00:02:00.000Z", null, null);
    const trackingFinalization = new TrackingFinalizationTransaction(
      new SQLiteReviewAttemptFinalizationTransaction(database.drizzle, createLearningScheduler())
    );
    const graph = createScenarioGraph(
      database,
      new TestClock(),
      new SequenceIdGenerator(),
      () => 0,
      trackingFinalization
    );

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await Promise.all([
      graph.study.finalizeAttemptsOutsideEditableWindow(testId(900)),
      graph.study.finalizeAttemptsOutsideEditableWindow(testId(900)),
    ]);

    const state = await memoryStates.findByFlashcardId(firstAttempt.flashcardId);
    expect(state?.reps).toBe(2);
    expect(state?.lastReviewAt).toBe("2026-01-01T00:02:00.000Z");
    expect(trackingFinalization.maximumConcurrentCalls).toBe(1);
    expect(trackingFinalization.finalizedAttemptIds).toEqual([firstAttempt.id, secondAttempt.id]);
    const finalizedFirstAttempt = await attempts.findById(firstAttempt.id);
    const finalizedSecondAttempt = await attempts.findById(secondAttempt.id);
    expect(finalizedFirstAttempt?.finalizedAt).not.toBeNull();
    expect(finalizedSecondAttempt?.finalizedAt).not.toBeNull();
  });

  it("commits memory before feed extension reads candidates", async () => {
    const card = makeFlashcard(1);
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    const observedStates: Array<LearnerMemoryState | null> = [];
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
    const prepared = await feed.prepareFeed([card], "mixed", null, false);
    const attemptId = await graph.study.startAttempt(card.id, 0, prepared.studySessionId);
    await graph.study.rateAttempt(attemptId, "good");

    await completeReelActivation(
      async () =>
        (await graph.study.updateSessionReelPosition(prepared.studySessionId, 5)) !== null,
      async () => undefined,
      () => feed.recordVisibleCard(prepared.studySessionId, card.id),
      () => graph.study.finalizeAttemptsOutsideEditableWindow(prepared.studySessionId),
      () => graph.study.compactSessionRuntimeData(prepared.studySessionId, 0),
      async () => {
        await feed.extendFeed([card], prepared.studySessionId);
      }
    );

    expect(observedStates.at(-1)).not.toBeNull();
  });

  it("lets an unrated skip finalize without blocking a rated review", async () => {
    const skippedAttempt = await createAttempt(916, 0);
    const ratedAttempt = await createAttempt(917, 1);
    const rating = new SQLiteReviewAttemptTransaction(database.drizzle);
    await rating.rateAttempt(ratedAttempt.id, "good", "2026-01-01T00:01:00.000Z", null, null);
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());

    await graph.study.updateSessionReelPosition(testId(900), 5);
    await graph.study.finalizeAttemptsOutsideEditableWindow(testId(900));
    const skippedAttemptAfterFirstPass = await attempts.findById(skippedAttempt.id);
    const ratedAttemptAfterFirstPass = await attempts.findById(ratedAttempt.id);
    expect(skippedAttemptAfterFirstPass?.finalizedAt).not.toBeNull();
    expect(ratedAttemptAfterFirstPass?.finalizedAt).toBeNull();

    await graph.study.updateSessionReelPosition(testId(900), 6);
    await graph.study.finalizeAttemptsOutsideEditableWindow(testId(900));
    const ratedAttemptAfterSecondPass = await attempts.findById(ratedAttempt.id);
    expect(ratedAttemptAfterSecondPass?.finalizedAt).not.toBeNull();
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
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(index),
      rating: null,
      ratedAt: null,
      reelPosition,
      studySessionId: testId(900),
      updatedAt: RATED_AT_AGAIN,
    });
    await attempts.create(attempt);
    return attempt;
  }
});

function withPersistence(state: SchedulerMemoryState): LearnerMemoryState {
  return {
    ...state,
    createdAt: FINALIZED_AT,
    updatedAt: FINALIZED_AT,
  };
}

class TrackingFinalizationTransaction implements ReviewAttemptFinalizationTransaction {
  private activeCalls = 0;
  private readonly delegate: ReviewAttemptFinalizationTransaction;
  maximumConcurrentCalls = 0;
  readonly finalizedAttemptIds: string[] = [];

  constructor(delegate: ReviewAttemptFinalizationTransaction) {
    this.delegate = delegate;
  }

  async finalizeAttempt(
    attemptId: string,
    finalizedAt: string,
    updatedAt: string
  ): Promise<boolean> {
    this.activeCalls += 1;
    this.maximumConcurrentCalls = Math.max(this.maximumConcurrentCalls, this.activeCalls);
    await Promise.resolve();
    try {
      const finalized = await this.delegate.finalizeAttempt(attemptId, finalizedAt, updatedAt);
      if (finalized) {
        this.finalizedAttemptIds.push(attemptId);
      }
      return finalized;
    } finally {
      this.activeCalls -= 1;
    }
  }
}
