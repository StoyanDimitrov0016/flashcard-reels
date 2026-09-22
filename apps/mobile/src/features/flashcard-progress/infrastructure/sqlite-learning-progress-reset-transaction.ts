import { and, eq, isNull, or, sql } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearningProgressResetTransaction } from "@/features/flashcard-progress/application/learning-progress-reset-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  flashcardMemoryStates,
  flashcards,
  flashcardProgress,
  reviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteLearningProgressResetTransaction<
  TRunResult = unknown,
> implements LearningProgressResetTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async resetCard(flashcardId: string, resetAt: string): Promise<void> {
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

      this.resetFlashcardProgressRow(
        transaction,
        flashcardId,
        card.deckId,
        card.createdAt,
        resetAt
      );
      transaction
        .delete(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.flashcardId, flashcardId))
        .run();
      transaction.delete(reviewEvents).where(eq(reviewEvents.flashcardId, flashcardId)).run();
      const remainingReviews = transaction
        .select({ lastReviewedAt: sql<string | null>`max(${reviewEvents.reviewedAt})` })
        .from(reviewEvents)
        .where(eq(reviewEvents.deckId, card.deckId))
        .get();
      if (remainingReviews?.lastReviewedAt) {
        transaction
          .update(deckProgress)
          .set({ lastReviewedAt: remainingReviews.lastReviewedAt })
          .where(eq(deckProgress.deckId, card.deckId))
          .run();
      } else {
        transaction.delete(deckProgress).where(eq(deckProgress.deckId, card.deckId)).run();
      }
      this.deleteActiveSessionsForDeck(transaction, card.deckId);
    });
  }

  async resetDeck(deckId: DeckId, resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, deckId: flashcards.deckId, id: flashcards.id })
        .from(flashcards)
        .where(eq(flashcards.deckId, deckId))
        .all();
      transaction.delete(flashcardProgress).where(eq(flashcardProgress.deckId, deckId)).run();
      this.resetCardsProgress(transaction, cards, resetAt);
      transaction
        .delete(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.deckId, deckId))
        .run();
      transaction.delete(reviewEvents).where(eq(reviewEvents.deckId, deckId)).run();
      transaction.delete(deckProgress).where(eq(deckProgress.deckId, deckId)).run();
      this.deleteActiveSessionsForDeck(transaction, deckId);
    });
  }

  async resetAll(resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, deckId: flashcards.deckId, id: flashcards.id })
        .from(flashcards)
        .all();
      transaction.delete(flashcardProgress).run();
      this.resetCardsProgress(transaction, cards, resetAt);
      transaction.delete(flashcardMemoryStates).run();
      transaction.delete(reviewEvents).run();
      transaction.delete(deckProgress).run();
      transaction.delete(studySessions).where(isNull(studySessions.completedAt)).run();
    });
  }

  private resetCardsProgress(
    transaction: Parameters<Parameters<DrizzleDatabase<TRunResult>["transaction"]>[0]>[0],
    cards: readonly { createdAt: string; deckId: string; id: string }[],
    resetAt: string
  ): void {
    for (const card of cards) {
      this.resetFlashcardProgressRow(transaction, card.id, card.deckId, card.createdAt, resetAt);
    }
  }

  private resetFlashcardProgressRow(
    transaction: Parameters<Parameters<DrizzleDatabase<TRunResult>["transaction"]>[0]>[0],
    flashcardId: string,
    deckId: string,
    createdAt: string,
    resetAt: string
  ): void {
    transaction
      .insert(flashcardProgress)
      .values({
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
      })
      .onConflictDoUpdate({
        target: flashcardProgress.flashcardId,
        set: {
          againCount: 0,
          easyCount: 0,
          firstReviewedAt: null,
          goodCount: 0,
          hardCount: 0,
          lastReviewedAt: null,
          resetAt,
          reviewCount: 0,
          updatedAt: resetAt,
        },
      })
      .run();
  }

  private deleteActiveSessionsForDeck(
    transaction: Parameters<Parameters<DrizzleDatabase<TRunResult>["transaction"]>[0]>[0],
    deckId: string
  ): void {
    transaction
      .delete(studySessions)
      .where(
        and(
          isNull(studySessions.completedAt),
          or(
            eq(studySessions.scope, "mixed"),
            and(eq(studySessions.scope, "focused"), eq(studySessions.deckId, deckId))
          )
        )
      )
      .run();
  }
}
