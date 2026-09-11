import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LearnerProfileServiceImpl } from "@/features/learner-profile/application/learner-profile.service.impl";
import { SQLiteLearningProgressResetTransaction } from "@/features/learner-profile/infrastructure/sqlite-learning-progress-reset-transaction";
import {
  decks,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  flashcards,
  learnerProfiles,
  studySessionItems,
  studySessionRecurrences,
  studySessions,
} from "@/infrastructure/sqlite/schema";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { makeFlashcard, OTHER_DECK_ID, TEST_DECK_ID, testId } from "../support/study-test-support";

const RESET_AT = "2026-02-01T00:00:00.000Z";
const REVIEWED_AT = "2026-01-01T00:00:00.000Z";

describe("SQLite learning progress reset transaction", () => {
  let database: NodeSqliteDatabase;
  let service: LearnerProfileServiceImpl;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await insertDeck(TEST_DECK_ID, "Deck A");
    await insertDeck(OTHER_DECK_ID, "Deck B");
    await insertCard(1, TEST_DECK_ID);
    await insertCard(2, TEST_DECK_ID);
    await insertCard(3, OTHER_DECK_ID);
    service = new LearnerProfileServiceImpl(
      {
        findByFlashcardId: async () => null,
        findByFlashcardIds: async () => new Map(),
        findCurrentByFlashcardIds: async () => new Map(),
        resetAll: async () => undefined,
        resetCard: async () => undefined,
        resetDeck: async () => undefined,
      },
      { now: () => RESET_AT },
      new SQLiteLearningProgressResetTransaction(database.drizzle)
    );
  });

  afterEach(() => database.close());

  it("globally resets profiles and memory and cascades active provisional state", async () => {
    await insertProfile(1);
    await insertMemory(1);
    await insertProfile(3);
    await insertMemory(3);
    await insertActiveSession("active-mixed", "mixed", null, true);
    await insertCompletedSession("completed-mixed");

    await service.resetAllProgress();

    expect(await profileRows()).toEqual([
      { flashcardId: makeFlashcard(1).id, resetAt: RESET_AT, reviewCount: 0 },
      { flashcardId: makeFlashcard(2).id, resetAt: RESET_AT, reviewCount: 0 },
      { flashcardId: makeFlashcard(3, OTHER_DECK_ID).id, resetAt: RESET_AT, reviewCount: 0 },
    ]);
    expect(await database.drizzle.select().from(flashcardMemoryStates)).toEqual([]);
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM study_sessions WHERE completed_at IS NULL"
      )
    ).toEqual({ count: 0 });
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_session_items")
    ).toEqual({ count: 0 });
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM flashcard_review_attempts")
    ).toEqual({ count: 0 });
    expect(
      await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_session_recurrences")
    ).toEqual({ count: 0 });
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM study_sessions WHERE id = ?",
        "completed-mixed"
      )
    ).toEqual({ count: 1 });
    expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM decks")).toEqual({
      count: 2,
    });
    expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM flashcards")).toEqual({
      count: 3,
    });
  });

  it("resets one deck, preserves other deck state, and invalidates mixed and focused sessions", async () => {
    await insertProfile(1);
    await insertMemory(1);
    await insertProfile(2);
    await insertMemory(2);
    await insertProfile(3);
    await insertMemory(3);
    await insertActiveSession("mixed", "mixed", null, false);
    await insertActiveSession("focused-a", "focused", TEST_DECK_ID, false);

    await service.resetDeckProgress(TEST_DECK_ID);

    expect(await profileRow(1)).toMatchObject({ resetAt: RESET_AT, reviewCount: 0 });
    expect(await profileRow(2)).toMatchObject({ resetAt: RESET_AT, reviewCount: 0 });
    expect(await profileRow(3)).toMatchObject({ resetAt: null, reviewCount: 1 });
    expect(await memoryRow(1)).toBeNull();
    expect(await memoryRow(2)).toBeNull();
    expect(await memoryRow(3)).not.toBeNull();
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM study_sessions WHERE completed_at IS NULL"
      )
    ).toEqual({ count: 0 });
  });

  it("resets one card while preserving another card's profile and memory", async () => {
    await insertProfile(1);
    await insertMemory(1);
    await insertProfile(2);
    await insertMemory(2);
    await insertActiveSession("active", "mixed", null, false);

    await service.resetCardProgress(makeFlashcard(1).id);

    expect(await profileRow(1)).toMatchObject({ resetAt: RESET_AT, reviewCount: 0 });
    expect(await profileRow(2)).toMatchObject({ resetAt: null, reviewCount: 1 });
    expect(await memoryRow(1)).toBeNull();
    expect(await memoryRow(2)).not.toBeNull();
    expect(
      await database.getFirstAsync(
        "SELECT COUNT(*) AS count FROM study_sessions WHERE completed_at IS NULL"
      )
    ).toEqual({ count: 0 });
  });

  async function insertDeck(id: string, title: string): Promise<void> {
    await database.drizzle.insert(decks).values({
      createdAt: REVIEWED_AT,
      description: title,
      id,
      title,
      updatedAt: REVIEWED_AT,
    });
  }

  async function insertCard(index: number, deckId: string): Promise<void> {
    const card = makeFlashcard(index, deckId);
    await database.drizzle.insert(flashcards).values({
      answer: card.answer,
      createdAt: card.createdAt,
      deckId,
      id: card.id,
      order: card.order,
      question: card.question,
      updatedAt: card.updatedAt,
    });
  }

  async function insertProfile(index: number): Promise<void> {
    const card = makeFlashcard(index, index === 3 ? OTHER_DECK_ID : TEST_DECK_ID);
    await database.drizzle.insert(learnerProfiles).values({
      againCount: 0,
      createdAt: card.createdAt,
      easyCount: 0,
      firstReviewedAt: REVIEWED_AT,
      flashcardId: card.id,
      goodCount: 1,
      hardCount: 0,
      lastReviewedAt: REVIEWED_AT,
      resetAt: null,
      reviewCount: 1,
      updatedAt: REVIEWED_AT,
    });
  }

  async function insertMemory(index: number): Promise<void> {
    const card = makeFlashcard(index, index === 3 ? OTHER_DECK_ID : TEST_DECK_ID);
    await database.drizzle.insert(flashcardMemoryStates).values({
      createdAt: REVIEWED_AT,
      difficulty: 5,
      dueAt: REVIEWED_AT,
      elapsedDays: 1,
      flashcardId: card.id,
      lapses: 0,
      lastReviewAt: REVIEWED_AT,
      learningSteps: 0,
      reps: 1,
      scheduledDays: 1,
      stability: 2,
      state: "review",
      updatedAt: REVIEWED_AT,
    });
  }

  async function insertActiveSession(
    id: string,
    scope: "mixed" | "focused",
    deckId: string | null,
    withChildren: boolean
  ): Promise<void> {
    await database.drizzle.insert(studySessions).values({
      createdAt: REVIEWED_AT,
      currentReelPosition: 0,
      deckId,
      feedState: "{}",
      id,
      lastActiveAt: REVIEWED_AT,
      scope,
    });
    if (!withChildren) {
      return;
    }
    const card = makeFlashcard(1);
    await database.drizzle.insert(studySessionItems).values({
      baseFeedPosition: 0,
      flashcardId: card.id,
      id: testId(901),
      reelPosition: 0,
      studySessionId: id,
    });
    await database.drizzle.insert(flashcardReviewAttempts).values({
      createdAt: REVIEWED_AT,
      flashcardId: card.id,
      id: testId(902),
      ratedAt: REVIEWED_AT,
      rating: "good",
      reelPosition: 0,
      studySessionId: id,
      updatedAt: REVIEWED_AT,
    });
    await database.drizzle.insert(studySessionRecurrences).values({
      createdAt: REVIEWED_AT,
      flashcardId: card.id,
      id: testId(903),
      sourceAttemptId: testId(902),
      studySessionId: id,
      targetReelPosition: 8,
    });
  }

  async function insertCompletedSession(id: string): Promise<void> {
    await database.drizzle.insert(studySessions).values({
      completedAt: REVIEWED_AT,
      createdAt: REVIEWED_AT,
      currentReelPosition: 0,
      feedState: "{}",
      id,
      lastActiveAt: REVIEWED_AT,
      scope: "mixed",
    });
  }

  async function profileRow(index: number): Promise<unknown> {
    return database.getFirstAsync(
      "SELECT flashcard_id AS flashcardId, reset_at AS resetAt, review_count AS reviewCount FROM learner_profiles WHERE flashcard_id = ?",
      makeFlashcard(index, index === 3 ? OTHER_DECK_ID : TEST_DECK_ID).id
    );
  }

  async function profileRows(): Promise<unknown> {
    return database.getAllAsync(
      "SELECT flashcard_id AS flashcardId, reset_at AS resetAt, review_count AS reviewCount FROM learner_profiles ORDER BY flashcard_id"
    );
  }

  async function memoryRow(index: number): Promise<unknown> {
    return database.getFirstAsync(
      "SELECT flashcard_id AS flashcardId FROM flashcard_memory_states WHERE flashcard_id = ?",
      makeFlashcard(index, index === 3 ? OTHER_DECK_ID : TEST_DECK_ID).id
    );
  }
});
