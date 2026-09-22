import { and, eq, inArray, isNull, or } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearningProgressResetTransaction } from "@/features/learner-profile/application/learning-progress-reset-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  flashcardMemoryStates,
  flashcards,
  learnerProfiles,
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

      this.resetProfile(transaction, flashcardId, card.deckId, card.createdAt, resetAt);
      transaction
        .delete(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.flashcardId, flashcardId))
        .run();
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
      this.resetProfiles(transaction, cards, resetAt);
      if (cards.length > 0) {
        transaction
          .delete(flashcardMemoryStates)
          .where(
            inArray(
              flashcardMemoryStates.flashcardId,
              cards.map((card) => card.id)
            )
          )
          .run();
      }
      this.deleteActiveSessionsForDeck(transaction, deckId);
    });
  }

  async resetAll(resetAt: string): Promise<void> {
    this.database.transaction((transaction) => {
      const cards = transaction
        .select({ createdAt: flashcards.createdAt, deckId: flashcards.deckId, id: flashcards.id })
        .from(flashcards)
        .all();
      transaction.delete(learnerProfiles).run();
      this.resetProfiles(transaction, cards, resetAt);
      transaction.delete(flashcardMemoryStates).run();
      transaction.delete(reviewEvents).run();
      transaction.delete(deckProgress).run();
      transaction.delete(studySessions).where(isNull(studySessions.completedAt)).run();
    });
  }

  private resetProfiles(
    transaction: Parameters<Parameters<DrizzleDatabase<TRunResult>["transaction"]>[0]>[0],
    cards: readonly { createdAt: string; deckId: string; id: string }[],
    resetAt: string
  ): void {
    for (const card of cards) {
      this.resetProfile(transaction, card.id, card.deckId, card.createdAt, resetAt);
    }
  }

  private resetProfile(
    transaction: Parameters<Parameters<DrizzleDatabase<TRunResult>["transaction"]>[0]>[0],
    flashcardId: string,
    deckId: string,
    createdAt: string,
    resetAt: string
  ): void {
    transaction
      .insert(learnerProfiles)
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
        target: learnerProfiles.flashcardId,
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
