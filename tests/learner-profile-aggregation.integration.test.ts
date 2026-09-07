import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SQLiteLearnerProfileAggregationTransaction } from "@/features/learner-profile/infrastructure/sqlite-learner-profile-aggregation-transaction";
import type { LearnerProfileAggregationTransaction } from "@/features/learner-profile/services/learner-profile-aggregation-transaction";
import { SQLiteLearnerProfileRepository } from "@/features/learner-profile/infrastructure/sqlite-learner-profile.repository";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { StudyService } from "@/features/study/services/study.service";
import { NodeSqliteDatabase } from "./support/node-sqlite-database";
import {
  TEST_DECK_ID,
  SequenceIdGenerator,
  TestClock,
  makeFlashcard,
  makeSession,
  testId,
} from "./support/study-test-support";

describe("SQLite learner-profile aggregation", () => {
  let database: NodeSqliteDatabase;
  let attempts: SQLiteReviewAttemptRepository;
  let aggregation: SQLiteLearnerProfileAggregationTransaction;
  let profiles: SQLiteLearnerProfileRepository;
  let sessions: SQLiteStudySessionRepository;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await database.runAsync(
      "INSERT INTO decks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      TEST_DECK_ID,
      "Test deck",
      "Test deck",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    );
    await Promise.all(
      [makeFlashcard(1), makeFlashcard(2)].map((card) =>
        database.runAsync(
          "INSERT INTO flashcards (id, deck_id, deck_position, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          card.id,
          card.deckId,
          card.deckPosition,
          card.question,
          card.answer,
          card.createdAt,
          card.updatedAt
        )
      )
    );
    attempts = new SQLiteReviewAttemptRepository(database.drizzle);
    aggregation = new SQLiteLearnerProfileAggregationTransaction(database.drizzle);
    profiles = new SQLiteLearnerProfileRepository(database.drizzle);
    sessions = new SQLiteStudySessionRepository(database.drizzle);
  });

  afterEach(() => {
    database.close();
  });

  it("aggregates only finalized attempts and is idempotent on retry", async () => {
    const session = makeSession(testId(500), "mixed");
    await sessions.create(session);
    await createAttempt(session.id, 0, "again", "2026-01-01T00:01:00.000Z");
    await createAttempt(session.id, 1, "hard", "2026-01-01T00:02:00.000Z");
    await createAttempt(session.id, 2, "good", "2026-01-01T00:03:00.000Z");
    await createAttempt(session.id, 3, "easy", "2026-01-01T00:04:00.000Z");
    await createAttempt(session.id, 4, null, "2026-01-01T00:05:00.000Z");
    const editable = await createAttempt(session.id, 5, null, null);
    const ratingTransaction = new SQLiteReviewAttemptTransaction(database.drizzle);
    await ratingTransaction.rateAttempt(
      editable.id,
      "again",
      "2026-01-01T00:06:00.000Z",
      null,
      null
    );
    await ratingTransaction.rateAttempt(
      editable.id,
      "good",
      "2026-01-01T00:07:00.000Z",
      null,
      null
    );
    await attempts.finalize(editable.id, "2026-01-01T00:08:00.000Z", "2026-01-01T00:08:00.000Z");

    await expect(aggregation.aggregate(session.id, 5, "2026-01-01T00:09:00.000Z")).resolves.toEqual(
      { aggregatedAttemptCount: 5, throughReelPosition: 5 }
    );
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      againCount: 1,
      easyCount: 1,
      goodCount: 2,
      hardCount: 1,
      reviewCount: 5,
    });
    expect(
      await database.getFirstAsync(
        "SELECT aggregated_through_reel_position AS position FROM study_sessions WHERE id = ?",
        session.id
      )
    ).toEqual({ position: 5 });

    await expect(aggregation.aggregate(session.id, 5, "2026-01-01T00:10:00.000Z")).resolves.toEqual(
      { aggregatedAttemptCount: 0, throughReelPosition: 5 }
    );
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({ reviewCount: 5 });
  });

  it("advances in bounded ranges instead of scanning the entire history", async () => {
    const session = makeSession(testId(510), "mixed");
    await sessions.create(session);
    await createAttempt(session.id, 30, "hard", "2026-01-01T00:01:00.000Z");

    await expect(
      aggregation.aggregate(session.id, 100, "2026-01-01T00:02:00.000Z")
    ).resolves.toEqual({ aggregatedAttemptCount: 0, throughReelPosition: 24 });
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toBeNull();

    await expect(
      aggregation.aggregate(session.id, 100, "2026-01-01T00:03:00.000Z")
    ).resolves.toEqual({ aggregatedAttemptCount: 1, throughReelPosition: 49 });
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({ hardCount: 1 });
  });

  it("rolls back profile updates and checkpoint advancement together", async () => {
    const session = makeSession(testId(520), "mixed");
    await sessions.create(session);
    await profiles.resetCard(makeFlashcard(1).id, "2025-12-01T00:00:00.000Z");
    await createAttempt(session.id, 0, "good", "2026-01-01T00:01:00.000Z");
    await database.runAsync(
      "CREATE TRIGGER fail_learner_profile_update BEFORE UPDATE ON learner_profiles BEGIN SELECT RAISE(ABORT, 'profile update failed'); END"
    );

    await expect(aggregation.aggregate(session.id, 0, "2026-01-01T00:02:00.000Z")).rejects.toThrow(
      "profile update failed"
    );
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({ reviewCount: 0 });
    expect(
      await database.getFirstAsync(
        "SELECT aggregated_through_reel_position AS position FROM study_sessions WHERE id = ?",
        session.id
      )
    ).toEqual({ position: -1 });
  });

  it("honors reset boundaries while allowing later attempts to contribute", async () => {
    const session = makeSession(testId(530), "mixed");
    await sessions.create(session);
    await createAttempt(session.id, 0, "again", "2026-01-01T00:01:00.000Z");
    await profiles.resetCard(makeFlashcard(1).id, "2026-01-01T00:02:00.000Z");

    await aggregation.aggregate(session.id, 0, "2026-01-01T00:03:00.000Z");
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({ reviewCount: 0 });

    await createAttempt(session.id, 1, "good", "2026-01-01T00:04:00.000Z");
    await aggregation.aggregate(session.id, 1, "2026-01-01T00:05:00.000Z");
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      goodCount: 1,
      reviewCount: 1,
      resetAt: "2026-01-01T00:02:00.000Z",
    });
  });

  it("uses the immutable rating time across editable finalization and reconstruction", async () => {
    const session = makeSession(testId(535), "mixed");
    await sessions.create(session);
    const editable = await createAttempt(session.id, 0, null, null);
    const ratingTransaction = new SQLiteReviewAttemptTransaction(database.drizzle);
    await ratingTransaction.rateAttempt(
      editable.id,
      "again",
      "2026-01-01T00:01:00.000Z",
      null,
      null
    );
    await ratingTransaction.rateAttempt(
      editable.id,
      "good",
      "2026-01-01T00:02:00.000Z",
      null,
      null
    );
    expect(await attempts.findById(editable.id)).toMatchObject({
      ratedAt: "2026-01-01T00:02:00.000Z",
      rating: "good",
    });

    await profiles.resetCard(makeFlashcard(1).id, "2026-01-01T00:03:00.000Z");
    await attempts.finalize(editable.id, "2026-01-01T00:04:00.000Z", "2026-01-01T00:04:00.000Z");
    await aggregation.aggregate(session.id, 0, "2026-01-01T00:05:00.000Z");
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      reviewCount: 0,
      resetAt: "2026-01-01T00:03:00.000Z",
    });

    const reconstructedAttempts = new SQLiteReviewAttemptRepository(database.drizzle);
    const reconstructedAggregation = new SQLiteLearnerProfileAggregationTransaction(
      database.drizzle
    );
    const reconstructedProfiles = new SQLiteLearnerProfileRepository(database.drizzle);
    const later = await createAttempt(session.id, 1, null, null);
    await new SQLiteReviewAttemptTransaction(database.drizzle).rateAttempt(
      later.id,
      "easy",
      "2026-01-01T00:06:00.000Z",
      null,
      null
    );
    await reconstructedAttempts.finalize(
      later.id,
      "2026-01-01T00:07:00.000Z",
      "2026-01-01T00:07:00.000Z"
    );
    await reconstructedAggregation.aggregate(session.id, 1, "2026-01-01T00:08:00.000Z");
    expect(await reconstructedProfiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      easyCount: 1,
      reviewCount: 1,
    });
  });

  it("aggregates all remaining history when a Focus session completes", async () => {
    const service = createService();
    const opened = await service.openSession("focused", TEST_DECK_ID, false);
    await createAttempt(opened.session.id, 0, "hard", "2026-01-01T00:01:00.000Z");

    await service.completeSession(opened.session.id);

    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      hardCount: 1,
      reviewCount: 1,
    });
    expect((await sessions.findById(opened.session.id))?.aggregatedThroughReelPosition).toBe(0);
  });

  it("aggregates safe history while an active Discover session continues", async () => {
    const service = createService();
    const opened = await service.openSession("mixed", null, false);
    await createAttempt(opened.session.id, 0, "again", "2026-01-01T00:01:00.000Z");
    await service.updateSessionReelPosition(opened.session.id, 130);
    await service.finalizeAttemptsOutsideEditableWindow(opened.session.id, 130);

    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      againCount: 1,
      reviewCount: 1,
    });
    expect((await sessions.findById(opened.session.id))?.aggregatedThroughReelPosition).toBe(24);
  });

  it("aggregates a replaced Focus session after its finalization boundary closes", async () => {
    const service = createService();
    const first = await service.openSession("focused", TEST_DECK_ID, false);
    await createAttempt(first.session.id, 0, "easy", "2026-01-01T00:01:00.000Z");

    const replacement = await service.openSession("focused", TEST_DECK_ID, true);

    expect(replacement.replacedSessionId).toBe(first.session.id);
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      easyCount: 1,
      reviewCount: 1,
    });
  });

  it("rediscovers a replaced completed Focus session after aggregation failure and reconstruction", async () => {
    const idGenerator = new SequenceIdGenerator();
    const service = createService(aggregation, sessions, idGenerator);
    const first = await service.openSession("focused", TEST_DECK_ID, false);
    await createAttempt(first.session.id, 0, "easy", null, "2026-01-01T00:01:00.000Z");
    const replacementService = createService(
      {
        aggregate: async () => {
          throw new Error("simulated aggregation interruption");
        },
      },
      sessions,
      idGenerator
    );

    await expect(replacementService.openSession("focused", TEST_DECK_ID, true)).rejects.toThrow(
      "simulated aggregation interruption"
    );
    expect((await sessions.findById(first.session.id))?.completedAt).not.toBeNull();
    expect((await sessions.findActiveByScope("focused"))?.id).not.toBe(first.session.id);

    const reconstructedSessions = new SQLiteStudySessionRepository(database.drizzle);
    const recovered = createService(
      new SQLiteLearnerProfileAggregationTransaction(database.drizzle),
      reconstructedSessions
    );
    await recovered.openSession("focused", TEST_DECK_ID, false);

    expect(await reconstructedSessions.findCompletedSessionsPendingAggregation(10)).toEqual([]);
    expect(await profiles.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      easyCount: 1,
      reviewCount: 1,
    });
    expect((await reconstructedSessions.findActiveByScope("focused"))?.id).not.toBe(
      first.session.id
    );
  });

  it("limits completed-session recovery results", async () => {
    const first = makeSession(testId(540), "focused");
    const second = makeSession(testId(541), "focused");
    await sessions.create(first);
    await createAttempt(first.id, 0, "good", "2026-01-01T00:01:00.000Z");
    await sessions.complete(first.id, "2026-01-01T00:03:00.000Z");
    await sessions.create(second);
    await createAttempt(second.id, 1, "hard", "2026-01-01T00:02:00.000Z");
    await sessions.complete(second.id, "2026-01-01T00:04:00.000Z");

    expect(await sessions.findCompletedSessionsPendingAggregation(1)).toHaveLength(1);
    expect((await sessions.findCompletedSessionsPendingAggregation(1))[0]?.id).toBe(first.id);
    expect(await sessions.findCompletedSessionsPendingAggregation(2)).toHaveLength(2);
  });

  function createService(
    aggregationTransaction: LearnerProfileAggregationTransaction | null = aggregation,
    sessionRepository: SQLiteStudySessionRepository = sessions,
    idGenerator: SequenceIdGenerator = new SequenceIdGenerator()
  ): StudyService {
    return new StudyService(
      attempts,
      sessionRepository,
      new SQLiteStudySessionItemRepository(database.drizzle),
      new SQLiteStudySessionRecurrenceRepository(database.drizzle),
      new TestClock(),
      idGenerator,
      new SQLiteReviewAttemptTransaction(database.drizzle),
      new SQLiteStudySessionFeedTransaction(database.drizzle),
      new SQLiteStudySessionLifecycleTransaction(database.drizzle),
      () => 0,
      aggregationTransaction
    );
  }

  async function createAttempt(
    studySessionId: string,
    reelPosition: number,
    rating: "again" | "hard" | "good" | "easy" | null,
    finalizedAt: string | null,
    ratedAt = finalizedAt
  ): Promise<FlashcardReviewAttempt> {
    const attempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt,
      flashcardId: makeFlashcard(1).id,
      id: testId(600 + reelPosition),
      rating,
      ratedAt,
      reelPosition,
      studySessionId,
      updatedAt: finalizedAt ?? "2026-01-01T00:00:00.000Z",
    });
    await attempts.create(attempt);
    return attempt;
  }
});
