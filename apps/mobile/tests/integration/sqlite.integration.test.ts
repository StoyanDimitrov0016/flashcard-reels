import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import { decks, flashcards as flashcardRows } from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  OTHER_DECK_ID,
  TEST_DECK_ID,
  makeFlashcard,
  makeSession,
  SequenceIdGenerator,
  TestClock,
  testId,
} from "../support/study-fixtures";

describe("SQLite study persistence", () => {
  let database: NodeSqliteDatabase;
  let sessions: SQLiteStudySessionRepository;
  let items: SQLiteStudySessionItemRepository;
  let attempts: SQLiteReviewAttemptRepository;
  let recurrences: SQLiteStudySessionRecurrenceRepository;
  let flashcards: SQLiteFlashcardRepository;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    const timestamp = "2026-01-01T00:00:00.000Z";
    await database.drizzle.insert(decks).values([
      {
        createdAt: timestamp,
        description: "Test deck",
        id: TEST_DECK_ID,
        title: "Test deck",
        updatedAt: timestamp,
      },
      {
        createdAt: timestamp,
        description: "Other deck",
        id: OTHER_DECK_ID,
        title: "Other deck",
        updatedAt: timestamp,
      },
    ]);
    await database.drizzle.insert(flashcardRows).values(
      [
        makeFlashcard(1, TEST_DECK_ID, 1),
        makeFlashcard(2, TEST_DECK_ID, 0),
        makeFlashcard(3, OTHER_DECK_ID),
      ].map((card) => ({
        answer: card.answer,
        createdAt: card.createdAt,
        deckId: card.deckId,
        id: card.id,
        order: card.order,
        question: card.question,
        updatedAt: card.updatedAt,
      }))
    );
    sessions = new SQLiteStudySessionRepository(database.drizzle);
    items = new SQLiteStudySessionItemRepository(database.drizzle);
    attempts = new SQLiteReviewAttemptRepository(database.drizzle);
    recurrences = new SQLiteStudySessionRecurrenceRepository(database.drizzle);
    flashcards = new SQLiteFlashcardRepository(database.drizzle);
  });

  afterEach(() => {
    database.close();
  });

  it("creates Mixed and Focused sessions with their defined deck relationships", async () => {
    const mixed = makeSession(testId(200), "mixed");
    const focused = makeSession(testId(201), "focused", TEST_DECK_ID);
    await sessions.create(mixed);
    await sessions.create(focused);

    const activeMixedSession = await sessions.findActive("mixed", null);
    const activeFocusedSession = await sessions.findActive("focused", TEST_DECK_ID);
    expect(activeMixedSession?.deckId).toBeNull();
    expect(activeFocusedSession?.deckId).toBe(TEST_DECK_ID);
    await expect(
      sessions.create(makeSession(testId(202), "mixed", TEST_DECK_ID))
    ).rejects.toThrow();
  });

  it("cascades all deck-owned study data when a deck is removed", async () => {
    await sessions.create(makeSession(testId(200), "mixed"));
    await sessions.create(makeSession(testId(201), "focused", TEST_DECK_ID));

    await expect(
      new SQLiteDeckRepository(database.drizzle).remove(TEST_DECK_ID)
    ).resolves.toBeUndefined();
    await expect(database.getAllAsync("PRAGMA foreign_key_check")).resolves.toEqual([]);
    await expect(
      database.getAllAsync("SELECT id FROM flashcards WHERE deck_id = ?", TEST_DECK_ID)
    ).resolves.toEqual([]);
  });

  it("enforces one active session per scope while permitting completed history", async () => {
    const first = makeSession(testId(203), "mixed");
    await sessions.create(first);
    await expect(sessions.create(makeSession(testId(204), "mixed"))).rejects.toThrow();

    await sessions.complete(first.id, "2026-01-01T00:01:00.000Z");
    await expect(sessions.create(makeSession(testId(205), "mixed"))).resolves.toBeUndefined();
  });

  it("replaces an active Focus session atomically without touching Discover", async () => {
    const clock = new TestClock();
    const service = new StudyServiceImpl(
      attempts,
      sessions,
      items,
      recurrences,
      clock,
      new SequenceIdGenerator(),
      new SQLiteReviewAttemptTransaction(database.drizzle),
      new SQLiteStudySessionFeedTransaction(database.drizzle),
      new SQLiteStudySessionLifecycleTransaction(database.drizzle),
      new SQLiteReviewAttemptFinalizationTransaction(database.drizzle, createLearningScheduler())
    );
    const mixed = await service.openSession("mixed", null, false);
    const firstFocus = await service.openSession("focused", TEST_DECK_ID, false);
    const replacement = await service.openSession("focused", OTHER_DECK_ID, false);

    expect(replacement.created).toBe(true);
    const replacedFocusSession = await sessions.findById(firstFocus.session.id);
    const preservedMixedSession = await sessions.findById(mixed.session.id);
    const activeSessionRows = await database.getAllAsync(
      "SELECT scope, COUNT(*) AS count FROM study_sessions WHERE completed_at IS NULL GROUP BY scope"
    );
    expect(replacedFocusSession?.completedAt).not.toBeNull();
    expect(preservedMixedSession?.completedAt).toBeNull();
    expect(activeSessionRows.length).toBe(2);
  });

  it("leaves no duplicate active sessions across repeated open paths", async () => {
    const clock = new TestClock();
    const service = new StudyServiceImpl(
      attempts,
      sessions,
      items,
      recurrences,
      clock,
      new SequenceIdGenerator(),
      new SQLiteReviewAttemptTransaction(database.drizzle),
      new SQLiteStudySessionFeedTransaction(database.drizzle),
      new SQLiteStudySessionLifecycleTransaction(database.drizzle),
      new SQLiteReviewAttemptFinalizationTransaction(database.drizzle, createLearningScheduler())
    );

    await Promise.all([
      service.openSession("mixed", null, false),
      service.openSession("mixed", null, false),
      service.openSession("mixed", null, false),
    ]);

    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM study_sessions WHERE scope = 'mixed' AND completed_at IS NULL"
      )
    ).toEqual({ count: 1 });
  });

  it("reads Focus cards by explicit deck order and enforces deck-order uniqueness", async () => {
    const cards = await flashcards.listByDeckId(TEST_DECK_ID);
    expect(cards.map((card) => [card.id, card.order])).toEqual([
      [makeFlashcard(2).id, 0],
      [makeFlashcard(1).id, 1],
    ]);

    await expect(
      database.runAsync(
        'INSERT INTO flashcards (id, deck_id, "order", question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        testId(270),
        TEST_DECK_ID,
        0,
        "Question 270",
        "Answer 270",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z"
      )
    ).rejects.toThrow();
    await expect(
      database.runAsync(
        'INSERT INTO flashcards (id, deck_id, "order", question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        testId(271),
        TEST_DECK_ID,
        -1,
        "Question 271",
        "Answer 271",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z"
      )
    ).rejects.toThrow();
  });

  it("returns session items ordered by position and permits repeated flashcards", async () => {
    const session = makeSession(testId(210), "mixed");
    await sessions.create(session);
    await items.createMany([
      new StudySessionItem({
        flashcardId: makeFlashcard(1).id,
        id: testId(211),
        baseFeedPosition: 2,
        reelPosition: 2,
        studySessionId: session.id,
      }),
      new StudySessionItem({
        flashcardId: makeFlashcard(1).id,
        id: testId(212),
        baseFeedPosition: 0,
        reelPosition: 0,
        studySessionId: session.id,
      }),
    ]);

    const stored = await items.listBySessionId(session.id);
    expect(stored.map((item) => [item.baseFeedPosition, item.flashcardId])).toEqual([
      [0, makeFlashcard(1).id],
      [2, makeFlashcard(1).id],
    ]);
    await expect(
      items.createMany([
        new StudySessionItem({
          flashcardId: makeFlashcard(2).id,
          id: testId(213),
          baseFeedPosition: 2,
          reelPosition: 2,
          studySessionId: session.id,
        }),
      ])
    ).rejects.toThrow();
  });

  it("reads only the requested session-item reel range", async () => {
    const session = makeSession(testId(216), "mixed");
    await sessions.create(session);
    await items.createMany(
      Array.from(
        { length: 12 },
        (_, reelPosition) =>
          new StudySessionItem({
            flashcardId: makeFlashcard((reelPosition % 2) + 1).id,
            id: testId(217 + reelPosition),
            baseFeedPosition: reelPosition,
            reelPosition,
            studySessionId: session.id,
          })
      )
    );

    const rangedItems = await items.listBySessionIdInReelPositionRange(session.id, 5, 7);
    expect(rangedItems.map((item) => item.reelPosition)).toEqual([5, 6, 7]);
    expect(await items.findMaxBaseFeedPosition(session.id)).toBe(11);
    expect(await items.findMaxReelPosition(session.id)).toBe(11);
  });

  it("reads only review attempts in the retained reel range", async () => {
    const session = makeSession(testId(229), "mixed");
    await sessions.create(session);
    await Promise.all(
      [10, 11, 12].map((reelPosition) =>
        attempts.create(
          new FlashcardReviewAttempt({
            createdAt: "2026-01-01T00:00:00.000Z",
            finalizedAt: null,
            flashcardId: makeFlashcard(1).id,
            id: testId(230 + reelPosition),
            rating: reelPosition === 11 ? "hard" : null,
            ratedAt: reelPosition === 11 ? "2026-01-01T00:00:00.000Z" : null,
            reelPosition,
            studySessionId: session.id,
            updatedAt: "2026-01-01T00:00:00.000Z",
          })
        )
      )
    );

    const stored = await attempts.listBySessionAndReelPositionRange(session.id, 11, 11);
    expect(stored.map((attempt) => [attempt.reelPosition, attempt.rating])).toEqual([[11, "hard"]]);
  });

  it("rolls back feed items and feed state together", async () => {
    const session = makeSession(testId(214), "mixed");
    await sessions.create(session);
    const feedTransaction = new SQLiteStudySessionFeedTransaction(database.drizzle);
    const item = new StudySessionItem({
      baseFeedPosition: 0,
      flashcardId: makeFlashcard(1).id,
      id: testId(215),
      reelPosition: 0,
      studySessionId: session.id,
    });
    const duplicate = new StudySessionItem({
      baseFeedPosition: 0,
      flashcardId: makeFlashcard(2).id,
      id: testId(216),
      reelPosition: 0,
      studySessionId: session.id,
    });

    await expect(
      feedTransaction.append(session.id, [item, duplicate], '{"cursor":1}')
    ).rejects.toThrow();
    expect(await items.listBySessionId(session.id)).toEqual([]);
    const rolledBackSession = await sessions.findById(session.id);
    expect(rolledBackSession?.feedState).toBe("{}");
  });

  it("rolls back a batch session-item insert when one item violates a constraint", async () => {
    const session = makeSession(testId(220), "mixed");
    await sessions.create(session);

    await expect(
      items.createMany([
        new StudySessionItem({
          flashcardId: makeFlashcard(1).id,
          id: testId(221),
          baseFeedPosition: 0,
          reelPosition: 0,
          studySessionId: session.id,
        }),
        new StudySessionItem({
          flashcardId: makeFlashcard(2).id,
          id: testId(222),
          baseFeedPosition: 0,
          reelPosition: 1,
          studySessionId: session.id,
        }),
      ])
    ).rejects.toThrow();
    expect(await items.listBySessionId(session.id)).toEqual([]);
  });

  it("protects finalized attempts from later rating updates", async () => {
    const session = makeSession(testId(230), "mixed");
    await sessions.create(session);
    const attempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(231),
      rating: null,
      reelPosition: 0,
      studySessionId: session.id,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await attempts.create(attempt);
    await expect(
      attempts.create(
        new FlashcardReviewAttempt({
          createdAt: attempt.createdAt,
          finalizedAt: null,
          flashcardId: attempt.flashcardId,
          id: testId(232),
          rating: null,
          reelPosition: attempt.reelPosition,
          studySessionId: attempt.studySessionId,
          updatedAt: attempt.updatedAt,
        })
      )
    ).rejects.toThrow();
    await attempts.create(
      new FlashcardReviewAttempt({
        createdAt: attempt.createdAt,
        finalizedAt: null,
        flashcardId: attempt.flashcardId,
        id: testId(233),
        rating: null,
        reelPosition: 1,
        studySessionId: attempt.studySessionId,
        updatedAt: attempt.updatedAt,
      })
    );
    await new SQLiteReviewAttemptFinalizationTransaction(
      database.drizzle,
      createLearningScheduler()
    ).finalizeAttempt(attempt.id, "2026-01-01T00:01:00.000Z", "2026-01-01T00:01:00.000Z");

    const transaction = new SQLiteReviewAttemptTransaction(database.drizzle);
    expect(
      await transaction.rateAttempt(attempt.id, "good", "2026-01-01T00:02:00.000Z", null, null)
    ).toBe(false);
    const finalizedAttempt = await attempts.findById(attempt.id);
    expect(finalizedAttempt?.rating).toBeNull();
  });

  it("rejects incoherent rating and learner-profile timestamp states", async () => {
    const session = makeSession(testId(274), "mixed");
    await sessions.create(session);
    await expect(
      database.runAsync(
        "INSERT INTO flashcard_review_attempts (id, study_session_id, flashcard_id, reel_position, rating, created_at, rated_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        testId(275),
        session.id,
        makeFlashcard(1).id,
        0,
        "good",
        "2026-01-01T00:00:00.000Z",
        null,
        "2026-01-01T00:00:00.000Z"
      )
    ).rejects.toThrow();
    await expect(
      database.runAsync(
        "INSERT INTO card_progress (flashcard_id, deck_id, review_count, again_count, hard_count, good_count, easy_count, first_reviewed_at, last_reviewed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        makeFlashcard(1).id,
        TEST_DECK_ID,
        0,
        0,
        0,
        0,
        0,
        "2026-01-01T00:00:00.000Z",
        null,
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z"
      )
    ).rejects.toThrow();
  });

  it("rolls back the rating when its recurrence write fails", async () => {
    const session = makeSession(testId(235), "mixed");
    await sessions.create(session);
    const attempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(236),
      rating: null,
      reelPosition: 0,
      studySessionId: session.id,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await attempts.create(attempt);
    const transaction = new SQLiteReviewAttemptTransaction(database.drizzle);

    await expect(
      transaction.rateAttempt(
        attempt.id,
        "again",
        "2026-01-01T00:01:00.000Z",
        new StudySessionRecurrence({
          consumedAt: null,
          createdAt: "2026-01-01T00:01:00.000Z",
          flashcardId: attempt.flashcardId,
          id: testId(237),
          sourceAttemptId: testId(238),
          studySessionId: session.id,
          targetReelPosition: 8,
        }),
        8
      )
    ).rejects.toThrow();

    const rolledBackAttempt = await attempts.findById(attempt.id);
    expect(rolledBackAttempt?.rating).toBeNull();
    expect(await recurrences.listBySessionId(session.id)).toEqual([]);
  });

  it("moves recurrence targets past committed base reels without changing them", async () => {
    const session = makeSession(testId(238), "mixed");
    await sessions.create(session);
    const baseItems = Array.from(
      { length: 1_001 },
      (_, reelPosition) =>
        new StudySessionItem({
          baseFeedPosition: reelPosition,
          flashcardId: makeFlashcard((reelPosition % 2) + 1).id,
          id: testId(340 + reelPosition),
          reelPosition,
          studySessionId: session.id,
        })
    );
    await items.createMany(baseItems);
    const attempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(352),
      rating: null,
      reelPosition: 0,
      studySessionId: session.id,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await attempts.create(attempt);
    const recurrence = new StudySessionRecurrence({
      consumedAt: null,
      createdAt: "2026-01-01T00:01:00.000Z",
      flashcardId: attempt.flashcardId,
      id: testId(353),
      sourceAttemptId: attempt.id,
      studySessionId: session.id,
      targetReelPosition: 8,
    });

    const transaction = new SQLiteReviewAttemptTransaction(database.drizzle);
    expect(
      await transaction.rateAttempt(attempt.id, "again", "2026-01-01T00:01:00.000Z", recurrence, 8)
    ).toBe(true);

    const shiftedRecurrences = await recurrences.listBySessionId(session.id);
    expect(shiftedRecurrences[0]?.targetReelPosition).toBe(1_001);
    expect(await items.listBySessionId(session.id)).toEqual(baseItems);
  });

  it("keeps recurrence references and enforces pending uniqueness rules", async () => {
    const session = makeSession(testId(240), "mixed");
    await sessions.create(session);
    const attempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(241),
      rating: "again",
      ratedAt: "2026-01-01T00:00:00.000Z",
      reelPosition: 0,
      studySessionId: session.id,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await attempts.create(attempt);
    const secondAttempt = new FlashcardReviewAttempt({
      createdAt: attempt.createdAt,
      finalizedAt: attempt.finalizedAt,
      flashcardId: makeFlashcard(2).id,
      id: testId(245),
      rating: attempt.rating,
      ratedAt: attempt.ratedAt,
      reelPosition: 1,
      studySessionId: attempt.studySessionId,
      updatedAt: attempt.updatedAt,
    });
    await attempts.create(secondAttempt);
    const recurrence = new StudySessionRecurrence({
      consumedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      flashcardId: attempt.flashcardId,
      id: testId(242),
      sourceAttemptId: attempt.id,
      studySessionId: session.id,
      targetReelPosition: 8,
    });
    await recurrences.create(recurrence);

    expect(await recurrences.listPendingFlashcardIdsFromTargetPosition(session.id, 7)).toEqual([
      attempt.flashcardId,
    ]);
    expect(await recurrences.listPendingFlashcardIdsFromTargetPosition(session.id, 8)).toEqual([]);

    await expect(
      recurrences.create(
        new StudySessionRecurrence({
          consumedAt: recurrence.consumedAt,
          createdAt: recurrence.createdAt,
          flashcardId: recurrence.flashcardId,
          id: testId(243),
          sourceAttemptId: recurrence.sourceAttemptId,
          studySessionId: recurrence.studySessionId,
          targetReelPosition: 9,
        })
      )
    ).rejects.toThrow();
    await expect(
      recurrences.create(
        new StudySessionRecurrence({
          consumedAt: recurrence.consumedAt,
          createdAt: recurrence.createdAt,
          flashcardId: recurrence.flashcardId,
          id: testId(244),
          sourceAttemptId: secondAttempt.id,
          studySessionId: recurrence.studySessionId,
          targetReelPosition: recurrence.targetReelPosition,
        })
      )
    ).rejects.toThrow();

    expect(await recurrences.markConsumed(recurrence.id, "2026-01-01T00:02:00.000Z")).toBe(true);
    await recurrences.create(
      new StudySessionRecurrence({
        consumedAt: recurrence.consumedAt,
        createdAt: recurrence.createdAt,
        flashcardId: secondAttempt.flashcardId,
        id: testId(246),
        sourceAttemptId: secondAttempt.id,
        studySessionId: recurrence.studySessionId,
        targetReelPosition: recurrence.targetReelPosition,
      })
    );
    expect(await recurrences.listBySessionId(session.id)).toHaveLength(2);
  });

  it("reserves the next free recurrence slot inside the SQLite transaction", async () => {
    const session = makeSession(testId(247), "mixed");
    await sessions.create(session);
    const firstAttempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(248),
      rating: "again",
      ratedAt: "2026-01-01T00:00:00.000Z",
      reelPosition: 0,
      studySessionId: session.id,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const secondAttempt = new FlashcardReviewAttempt({
      createdAt: firstAttempt.createdAt,
      finalizedAt: firstAttempt.finalizedAt,
      flashcardId: makeFlashcard(2).id,
      id: testId(249),
      rating: firstAttempt.rating,
      ratedAt: firstAttempt.ratedAt,
      reelPosition: 1,
      studySessionId: firstAttempt.studySessionId,
      updatedAt: firstAttempt.updatedAt,
    });
    await attempts.create(firstAttempt);
    await attempts.create(secondAttempt);

    const firstRecurrence = new StudySessionRecurrence({
      consumedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      flashcardId: firstAttempt.flashcardId,
      id: testId(250),
      sourceAttemptId: firstAttempt.id,
      studySessionId: session.id,
      targetReelPosition: 8,
    });
    const secondRecurrence = new StudySessionRecurrence({
      consumedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      flashcardId: secondAttempt.flashcardId,
      id: testId(251),
      sourceAttemptId: secondAttempt.id,
      studySessionId: session.id,
      targetReelPosition: 8,
    });

    const transaction = new SQLiteReviewAttemptTransaction(database.drizzle);
    expect(
      await transaction.rateAttempt(
        firstAttempt.id,
        "again",
        "2026-01-01T00:01:00.000Z",
        firstRecurrence,
        8
      )
    ).toBe(true);
    expect(
      await transaction.rateAttempt(
        secondAttempt.id,
        "again",
        "2026-01-01T00:01:00.000Z",
        secondRecurrence,
        8
      )
    ).toBe(true);
    const storedRecurrences = await recurrences.listBySessionId(session.id);
    expect(storedRecurrences.map((recurrence) => recurrence.targetReelPosition)).toEqual([8, 9]);
  });

  it("rejects recurrence rows whose session or source attempt does not exist", async () => {
    await expect(
      recurrences.create(
        new StudySessionRecurrence({
          consumedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          flashcardId: makeFlashcard(1).id,
          id: testId(250),
          sourceAttemptId: testId(251),
          studySessionId: testId(252),
          targetReelPosition: 1,
        })
      )
    ).rejects.toThrow();
  });

  it("cascades session-owned items, attempts, and recurrences", async () => {
    const session = makeSession(testId(260), "mixed");
    await sessions.create(session);
    const attempt = new FlashcardReviewAttempt({
      createdAt: "2026-01-01T00:00:00.000Z",
      finalizedAt: null,
      flashcardId: makeFlashcard(1).id,
      id: testId(261),
      rating: "again",
      ratedAt: "2026-01-01T00:00:00.000Z",
      reelPosition: 0,
      studySessionId: session.id,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await attempts.create(attempt);
    await items.createMany([
      new StudySessionItem({
        flashcardId: attempt.flashcardId,
        id: testId(262),
        baseFeedPosition: 0,
        reelPosition: 0,
        studySessionId: session.id,
      }),
    ]);
    await recurrences.create(
      new StudySessionRecurrence({
        consumedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        flashcardId: attempt.flashcardId,
        id: testId(263),
        sourceAttemptId: attempt.id,
        studySessionId: session.id,
        targetReelPosition: 8,
      })
    );

    await database.runAsync("DELETE FROM study_sessions WHERE id = ?", session.id);

    expect(await items.listBySessionId(session.id)).toEqual([]);
    expect(await attempts.findById(attempt.id)).toBeNull();
    expect(await recurrences.listBySessionId(session.id)).toEqual([]);
  });

  it("initializes only the canonical schema from an empty database", async () => {
    const tables = await database.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    expect(tables).toEqual([
      { name: "card_progress" },
      { name: "deck_appearances" },
      { name: "deck_progress" },
      { name: "decks" },
      { name: "flashcard_memory_states" },
      { name: "flashcard_review_attempts" },
      { name: "flashcards" },
      { name: "removed_decks" },
      { name: "review_events" },
      { name: "study_session_items" },
      { name: "study_session_recurrences" },
      { name: "study_sessions" },
    ]);
  });

  it("keeps the application-owned default cover for a future deck", async () => {
    expect(
      await database.getFirstAsync(
        "SELECT cover_asset AS coverAsset FROM decks WHERE id = ?",
        TEST_DECK_ID
      )
    ).toEqual({ coverAsset: "cards" });
  });
});
