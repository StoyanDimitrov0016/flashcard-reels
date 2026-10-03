import { and, eq } from "drizzle-orm";

import type { SavedProgressContinuationTransaction } from "@/features/decks/application/saved-progress-continuation.transaction";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { deckProgress, decks } from "@/infrastructure/sqlite/schema";
import { OperationError } from "@/shared/errors/operation-error";

export class SQLiteSavedProgressContinuationTransaction<
  TRunResult = unknown,
> implements SavedProgressContinuationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async continueProgress(id: DeckId): Promise<void> {
    this.database.transaction((transaction) => {
      const installed = transaction
        .select({ id: decks.id })
        .from(decks)
        .where(eq(decks.id, id))
        .get();
      if (!installed) {
        throw new OperationError({
          code: "DECK_NOT_FOUND",
          message: `Deck ${id} is not installed`,
        });
      }
      const resolved = transaction
        .update(deckProgress)
        .set({ status: "active" })
        .where(and(eq(deckProgress.deckId, id), eq(deckProgress.status, "pending")))
        .returning({ deckId: deckProgress.deckId })
        .all();
      if (resolved.length === 0) {
        throw new OperationError({
          code: "SAVED_PROGRESS_UNAVAILABLE",
          message: `Deck ${id} has no pending saved progress`,
        });
      }
    });
  }
}
