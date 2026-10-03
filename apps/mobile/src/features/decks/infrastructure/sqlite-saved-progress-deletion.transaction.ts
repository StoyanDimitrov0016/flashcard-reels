import { eq } from "drizzle-orm";

import type { SavedProgressDeletionTransaction } from "@/features/decks/application/saved-progress-deletion.transaction";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { SQLiteDeckLearnerData } from "@/features/decks/infrastructure/sqlite-deck-learner-data";
import { deckProgress } from "@/infrastructure/sqlite/schema";
import { OperationError } from "@/shared/errors/operation-error";

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
        .select({ status: deckProgress.status })
        .from(deckProgress)
        .where(eq(deckProgress.deckId, id))
        .get();
      if (record?.status === "active") {
        throw new OperationError({
          code: "SAVED_PROGRESS_UNAVAILABLE",
          message: `Deck ${id} must be archived or pending before deleting saved progress`,
        });
      }
      new SQLiteDeckLearnerData(transaction).deleteLearnerData(id);
    });
  }
}
