import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SQLiteFlashcardProgressRepository } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.repository";
import { SQLiteLearningProgressResetTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset-transaction";
import {
  decks,
  flashcards,
  flashcardReviewAttempts,
  flashcardProgress,
  studySessions,
} from "@/infrastructure/sqlite/schema";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { OTHER_DECK_ID, TEST_DECK_ID, makeFlashcard, testId } from "../support/study-fixtures";

describe("SQLite card progress", () => {
  let database: NodeSqliteDatabase;
  let progress: SQLiteFlashcardProgressRepository;
  let reset: SQLiteLearningProgressResetTransaction;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await insertDeck(TEST_DECK_ID, "Test deck");
    await insertDeck(OTHER_DECK_ID, "Other deck");
    await insertFlashcard(makeFlashcard(1, TEST_DECK_ID));
    await insertFlashcard(makeFlashcard(2, TEST_DECK_ID));
    await insertFlashcard(makeFlashcard(3, OTHER_DECK_ID));
    progress = new SQLiteFlashcardProgressRepository(database.drizzle);
    reset = new SQLiteLearningProgressResetTransaction(database.drizzle);
  });

  afterEach(() => {
    database.close();
  });

  it("reads existing progress for a candidate set in one batched repository operation", async () => {
    await reset.resetCard(makeFlashcard(1).id, "2026-01-02T00:00:00.000Z");
    await reset.resetCard(makeFlashcard(3, OTHER_DECK_ID).id, "2026-01-03T00:00:00.000Z");

    const result = await progress.findByFlashcardIds([
      makeFlashcard(1).id,
      makeFlashcard(2).id,
      makeFlashcard(3, OTHER_DECK_ID).id,
    ]);

    expect([...result.keys()]).toEqual([makeFlashcard(1).id, makeFlashcard(3, OTHER_DECK_ID).id]);
    expect(result.get(makeFlashcard(1).id)).toMatchObject({
      againCount: 0,
      flashcardId: makeFlashcard(1).id,
      resetAt: "2026-01-02T00:00:00.000Z",
      reviewCount: 0,
    });
    expect(await progress.findByFlashcardId(makeFlashcard(2).id)).toBeNull();
  });

  it("includes saved ratings that have not reached the aggregation window", async () => {
    const sessionId = testId(80);
    await database.drizzle.insert(studySessions).values({
      createdAt: "2026-01-02T00:00:00.000Z",
      currentReelPosition: 0,
      furthestReelPosition: 0,
      feedState: "{}",
      id: sessionId,
      lastActiveAt: "2026-01-02T00:00:00.000Z",
      scope: "mixed",
    });
    await database.drizzle.insert(flashcardReviewAttempts).values({
      createdAt: "2026-01-02T00:00:00.000Z",
      flashcardId: makeFlashcard(1).id,
      id: testId(81),
      ratedAt: "2026-01-02T00:01:00.000Z",
      rating: "good",
      reelPosition: 0,
      studySessionId: sessionId,
      updatedAt: "2026-01-02T00:01:00.000Z",
    });

    const currentProgress = await progress.findIncludingPendingRatingsByFlashcardIds([
      makeFlashcard(1).id,
    ]);
    expect(currentProgress.get(makeFlashcard(1).id)).toMatchObject({
      goodCount: 1,
      reviewCount: 1,
    });
  });

  it("resets one card, one deck, and all cards without deleting content", async () => {
    await reset.resetCard(makeFlashcard(1).id, "2026-01-02T00:00:00.000Z");
    await database.drizzle
      .update(flashcardProgress)
      .set({
        againCount: 1,
        firstReviewedAt: "2026-01-01T00:00:00.000Z",
        lastReviewedAt: "2026-01-01T00:00:00.000Z",
        reviewCount: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      })
      .where(eq(flashcardProgress.flashcardId, makeFlashcard(1).id));

    await reset.resetDeck(TEST_DECK_ID, "2026-01-03T00:00:00.000Z");
    expect(await progress.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      resetAt: "2026-01-03T00:00:00.000Z",
      reviewCount: 0,
    });
    expect(await progress.findByFlashcardId(makeFlashcard(2).id)).toMatchObject({
      resetAt: "2026-01-03T00:00:00.000Z",
      reviewCount: 0,
    });
    expect(await progress.findByFlashcardId(makeFlashcard(3, OTHER_DECK_ID).id)).toBeNull();

    await reset.resetAll("2026-01-04T00:00:00.000Z");
    const resetProgress = await progress.findByFlashcardIds([
      makeFlashcard(1).id,
      makeFlashcard(2).id,
      makeFlashcard(3, OTHER_DECK_ID).id,
    ]);
    expect([...resetProgress.values()].map((entry) => entry.resetAt)).toEqual([
      "2026-01-04T00:00:00.000Z",
      "2026-01-04T00:00:00.000Z",
      "2026-01-04T00:00:00.000Z",
    ]);
    expect(
      await database.getFirstAsync("SELECT id FROM flashcards WHERE id = ?", makeFlashcard(1).id)
    ).toEqual({
      id: makeFlashcard(1).id,
    });
  });

  it("retains a progress when its downloaded flashcard is deleted", async () => {
    await reset.resetCard(makeFlashcard(1).id, "2026-01-02T00:00:00.000Z");
    await database.drizzle.delete(flashcards).where(eq(flashcards.id, makeFlashcard(1).id));

    expect(await progress.findByFlashcardId(makeFlashcard(1).id)).toMatchObject({
      flashcardId: makeFlashcard(1).id,
    });
  });

  async function insertDeck(id: string, title: string): Promise<void> {
    await database.drizzle.insert(decks).values({
      createdAt: "2026-01-01T00:00:00.000Z",
      description: title,
      id,
      title,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  }

  async function insertFlashcard(card: ReturnType<typeof makeFlashcard>): Promise<void> {
    await database.drizzle.insert(flashcards).values({
      answer: card.answer,
      createdAt: card.createdAt,
      deckId: card.deckId,
      id: card.id,
      order: card.order,
      question: card.question,
      updatedAt: card.updatedAt,
    });
  }
});
