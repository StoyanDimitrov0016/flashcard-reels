import { eq } from "drizzle-orm";

import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  deckThemeSelections,
  flashcardMemoryStates,
  flashcardProgress,
  flashcardReviewEvents,
} from "@/infrastructure/sqlite/schema";

type Transaction<TRunResult> = Parameters<
  Parameters<DrizzleDatabase<TRunResult>["transaction"]>[0]
>[0];

// All operations run within the caller's transaction.
export class SQLiteDeckLearnerData<TRunResult = unknown> {
  private readonly transaction: Transaction<TRunResult>;

  constructor(transaction: Transaction<TRunResult>) {
    this.transaction = transaction;
  }

  archive(deckId: string): void {
    const saved = this.transaction
      .select({ deckId: deckProgress.deckId })
      .from(deckProgress)
      .where(eq(deckProgress.deckId, deckId))
      .get();
    this.transaction
      .update(deckProgress)
      .set({ status: "archived" })
      .where(eq(deckProgress.deckId, deckId))
      .run();
    if (!saved) {
      this.transaction.delete(flashcardProgress).where(eq(flashcardProgress.deckId, deckId)).run();
      this.transaction
        .delete(flashcardMemoryStates)
        .where(eq(flashcardMemoryStates.deckId, deckId))
        .run();
    }
  }

  deleteLearningProgress(deckId?: string): void {
    for (const table of [
      flashcardReviewEvents,
      flashcardProgress,
      flashcardMemoryStates,
      deckProgress,
    ]) {
      const deletion = this.transaction.delete(table);
      if (deckId === undefined) {
        deletion.run();
      } else {
        deletion.where(eq(table.deckId, deckId)).run();
      }
    }
  }

  deleteLearnerData(deckId?: string): void {
    this.deleteLearningProgress(deckId);
    const deletion = this.transaction.delete(deckThemeSelections);
    if (deckId === undefined) {
      deletion.run();
    } else {
      deletion.where(eq(deckThemeSelections.deckId, deckId)).run();
    }
  }
}
