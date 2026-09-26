import { and, eq } from "drizzle-orm";

import type { SavedProgressContinuationTransaction } from "@/features/decks/application/saved-progress-continuation.transaction";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { deckProgress, decks } from "@/infrastructure/sqlite/schema";

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
        throw new Error(`Deck ${id} is not installed`);
      }
      const resolved = transaction
        .update(deckProgress)
        .set({ resolution: "active" })
        .where(and(eq(deckProgress.deckId, id), eq(deckProgress.resolution, "pending")))
        .returning({ deckId: deckProgress.deckId })
        .all();
      if (resolved.length === 0) {
        throw new Error(`Deck ${id} has no pending saved progress`);
      }
    });
  }
}
