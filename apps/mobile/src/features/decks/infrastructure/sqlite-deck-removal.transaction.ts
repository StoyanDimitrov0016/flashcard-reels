import { eq, inArray } from "drizzle-orm";

import type { DeckRemovalTransaction } from "@/features/decks/application/deck-removal.transaction";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  flashcardProgress,
  deckAppearances,
  deckProgress,
  decks,
  flashcardMemoryStates,
  flashcardReviewAttempts,
  flashcards,
  lessons,
  removedDecks,
  studySessionItems,
  studySessionRecurrences,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteDeckRemovalTransaction<TRunResult = unknown> implements DeckRemovalTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async remove(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      transaction.insert(removedDecks).values({ id }).onConflictDoNothing().run();
      const savedProgress = transaction
        .select({ deckId: deckProgress.deckId })
        .from(deckProgress)
        .where(eq(deckProgress.deckId, id))
        .get();
      transaction
        .update(deckProgress)
        .set({ resolution: "archived" })
        .where(eq(deckProgress.deckId, id))
        .run();
      if (!savedProgress) {
        transaction.delete(flashcardProgress).where(eq(flashcardProgress.deckId, id)).run();
        transaction.delete(flashcardMemoryStates).where(eq(flashcardMemoryStates.deckId, id)).run();
      }
      const cardIds = transaction
        .select({ id: flashcards.id })
        .from(flashcards)
        .where(eq(flashcards.deckId, id))
        .all()
        .map((card) => card.id);
      transaction.delete(studySessions).where(eq(studySessions.deckId, id)).run();
      if (cardIds.length > 0) {
        transaction
          .delete(studySessionRecurrences)
          .where(inArray(studySessionRecurrences.flashcardId, cardIds))
          .run();
        transaction
          .delete(flashcardReviewAttempts)
          .where(inArray(flashcardReviewAttempts.flashcardId, cardIds))
          .run();
        transaction
          .delete(studySessionItems)
          .where(inArray(studySessionItems.flashcardId, cardIds))
          .run();
      }
      transaction.delete(flashcards).where(eq(flashcards.deckId, id)).run();
      transaction.delete(lessons).where(eq(lessons.deckId, id)).run();
      transaction.delete(deckAppearances).where(eq(deckAppearances.deckId, id)).run();
      transaction.delete(decks).where(eq(decks.id, id)).run();
    });
  }
}
