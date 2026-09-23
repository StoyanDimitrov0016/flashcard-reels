import { eq } from "drizzle-orm";

import type { SavedProgressDeletionTransaction } from "@/features/decks/application/saved-progress-deletion.transaction";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  flashcardProgress,
  deckProgress,
  flashcardMemoryStates,
  reviewEvents,
} from "@/infrastructure/sqlite/schema";

export class SQLiteSavedProgressDeletionTransaction<
  TRunResult = unknown,
> implements SavedProgressDeletionTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async deleteProgress(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      const record = transaction
        .select({ resolution: deckProgress.resolution })
        .from(deckProgress)
        .where(eq(deckProgress.deckId, id))
        .get();
      if (record?.resolution === "active") {
        throw new Error(`Deck ${id} must be archived or pending before deleting saved progress`);
      }
      transaction.delete(reviewEvents).where(eq(reviewEvents.deckId, id)).run();
      transaction.delete(flashcardProgress).where(eq(flashcardProgress.deckId, id)).run();
      transaction.delete(flashcardMemoryStates).where(eq(flashcardMemoryStates.deckId, id)).run();
      transaction.delete(deckProgress).where(eq(deckProgress.deckId, id)).run();
    });
  }
}
