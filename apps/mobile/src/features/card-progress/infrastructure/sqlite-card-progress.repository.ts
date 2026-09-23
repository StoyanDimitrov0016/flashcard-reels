import { and, asc, eq, gt, inArray, isNotNull } from "drizzle-orm";

import type { CardProgressRepository } from "@/features/card-progress/domain/card-progress.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { CardProgress } from "@/features/card-progress/domain/card-progress.model";
import {
  flashcardReviewAttempts,
  flashcards,
  cardProgress,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteCardProgressRepository<TRunResult = unknown> implements CardProgressRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findByFlashcardId(flashcardId: string): Promise<CardProgress | null> {
    const progress = await this.findByFlashcardIds([flashcardId]);
    return progress.get(flashcardId) ?? null;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, CardProgress>> {
    if (flashcardIds.length === 0) {
      return new Map();
    }
    const rows = await this.database
      .select()
      .from(cardProgress)
      .where(inArray(cardProgress.flashcardId, flashcardIds))
      .orderBy(asc(cardProgress.flashcardId));
    return new Map(rows.map((row) => [row.flashcardId, this.toModel(row)] as const));
  }

  async findCurrentByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, CardProgress>> {
    if (flashcardIds.length === 0) {
      return new Map();
    }
    const stored = await this.findByFlashcardIds(flashcardIds);
    const cards = await this.database
      .select({ createdAt: flashcards.createdAt, id: flashcards.id })
      .from(flashcards)
      .where(inArray(flashcards.id, flashcardIds));
    const pending = await this.database
      .select({
        flashcardId: flashcardReviewAttempts.flashcardId,
        ratedAt: flashcardReviewAttempts.ratedAt,
        rating: flashcardReviewAttempts.rating,
      })
      .from(flashcardReviewAttempts)
      .innerJoin(studySessions, eq(studySessions.id, flashcardReviewAttempts.studySessionId))
      .where(
        and(
          inArray(flashcardReviewAttempts.flashcardId, flashcardIds),
          isNotNull(flashcardReviewAttempts.rating),
          isNotNull(flashcardReviewAttempts.ratedAt),
          gt(flashcardReviewAttempts.reelPosition, studySessions.aggregatedThroughReelPosition)
        )
      );
    const createdAtById = new Map(cards.map((card) => [card.id, card.createdAt] as const));
    const current = new Map(stored);
    for (const attempt of pending) {
      if (!attempt.rating || !attempt.ratedAt) {
        continue;
      }
      const progress = current.get(attempt.flashcardId);
      if (progress?.resetAt && attempt.ratedAt <= progress.resetAt) {
        continue;
      }
      const createdAt = progress?.createdAt ?? createdAtById.get(attempt.flashcardId);
      if (!createdAt) {
        continue;
      }
      current.set(
        attempt.flashcardId,
        addPendingRating(progress, attempt.flashcardId, attempt.rating, attempt.ratedAt, createdAt)
      );
    }
    return current;
  }

  async resetCard(flashcardId: string, resetAt: string): Promise<void> {
    // Summary-only boundary for aggregation. User-facing reset uses
    // SQLiteLearningProgressResetTransaction to clear events and FSRS state too.
    this.database.transaction((transaction) => {
      const card = transaction
        .select({ createdAt: flashcards.createdAt, deckId: flashcards.deckId })
        .from(flashcards)
        .where(eq(flashcards.id, flashcardId))
        .limit(1)
        .all()[0];
      if (!card) {
        throw new Error(`Missing flashcard ${flashcardId}`);
      }
      transaction
        .insert(cardProgress)
        .values(this.zeroState(flashcardId, card.deckId, card.createdAt, resetAt))
        .onConflictDoUpdate({
          target: cardProgress.flashcardId,
          set: this.resetValues(resetAt),
        })
        .run();
    });
  }

  async resetDeck(deckId: DeckId, resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, deckId: flashcards.deckId, id: flashcards.id })
        .from(flashcards)
        .where(eq(flashcards.deckId, deckId))
        .all();
      for (const card of cards) {
        transaction
          .insert(cardProgress)
          .values(this.zeroState(card.id, card.deckId, card.createdAt, resetAt))
          .onConflictDoUpdate({
            target: cardProgress.flashcardId,
            set: this.resetValues(resetAt),
          })
          .run();
      }
    });
  }

  async resetAll(resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, deckId: flashcards.deckId, id: flashcards.id })
        .from(flashcards)
        .orderBy(asc(flashcards.id))
        .all();
      for (const card of cards) {
        transaction
          .insert(cardProgress)
          .values(this.zeroState(card.id, card.deckId, card.createdAt, resetAt))
          .onConflictDoUpdate({
            target: cardProgress.flashcardId,
            set: this.resetValues(resetAt),
          })
          .run();
      }
    });
  }

  private resetValues(resetAt: string) {
    return {
      againCount: 0,
      easyCount: 0,
      firstReviewedAt: null,
      goodCount: 0,
      hardCount: 0,
      lastReviewedAt: null,
      resetAt,
      reviewCount: 0,
      updatedAt: resetAt,
    };
  }

  private toModel(row: typeof cardProgress.$inferSelect): CardProgress {
    return new CardProgress({
      againCount: row.againCount,
      createdAt: row.createdAt,
      easyCount: row.easyCount,
      firstReviewedAt: row.firstReviewedAt,
      flashcardId: row.flashcardId,
      goodCount: row.goodCount,
      hardCount: row.hardCount,
      lastReviewedAt: row.lastReviewedAt,
      resetAt: row.resetAt,
      reviewCount: row.reviewCount,
      updatedAt: row.updatedAt,
    });
  }

  private zeroState(flashcardId: string, deckId: string, createdAt: string, resetAt: string) {
    return {
      againCount: 0,
      createdAt,
      deckId,
      easyCount: 0,
      firstReviewedAt: null,
      flashcardId,
      goodCount: 0,
      hardCount: 0,
      lastReviewedAt: null,
      resetAt,
      reviewCount: 0,
      updatedAt: resetAt,
    };
  }
}

function addPendingRating(
  progress: CardProgress | undefined,
  flashcardId: string,
  rating: RecallLevel,
  ratedAt: string,
  createdAt: string
): CardProgress {
  const againCount = (progress?.againCount ?? 0) + (rating === "again" ? 1 : 0);
  const hardCount = (progress?.hardCount ?? 0) + (rating === "hard" ? 1 : 0);
  const goodCount = (progress?.goodCount ?? 0) + (rating === "good" ? 1 : 0);
  const easyCount = (progress?.easyCount ?? 0) + (rating === "easy" ? 1 : 0);
  return new CardProgress({
    againCount,
    createdAt,
    easyCount,
    firstReviewedAt:
      progress?.firstReviewedAt && progress.firstReviewedAt < ratedAt
        ? progress.firstReviewedAt
        : ratedAt,
    flashcardId,
    goodCount,
    hardCount,
    lastReviewedAt:
      progress?.lastReviewedAt && progress.lastReviewedAt > ratedAt
        ? progress.lastReviewedAt
        : ratedAt,
    resetAt: progress?.resetAt ?? null,
    reviewCount: againCount + hardCount + goodCount + easyCount,
    updatedAt: ratedAt,
  });
}
