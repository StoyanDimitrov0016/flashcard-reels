import { asc, eq } from "drizzle-orm";

import type { ProgressBackupQuery } from "@/features/progress-backup/application/progress-backup.query";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  decks,
  flashcardMemoryStates,
  flashcardProgress,
  progressBackupState,
  reviewEvents,
} from "@/infrastructure/sqlite/schema";

export class SQLiteProgressBackupQuery<TRunResult = unknown> implements ProgressBackupQuery {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async read(exportedAt: string): Promise<ProgressBackupDocument> {
    return this.database.transaction((transaction) => ({
      format: "flashcard-reels-progress" as const,
      version: 1 as const,
      exportedAt,
      deckProgress: transaction.select().from(deckProgress).orderBy(asc(deckProgress.deckId)).all(),
      flashcardProgress: transaction
        .select()
        .from(flashcardProgress)
        .orderBy(asc(flashcardProgress.flashcardId))
        .all(),
      flashcardMemoryStates: transaction
        .select()
        .from(flashcardMemoryStates)
        .orderBy(asc(flashcardMemoryStates.flashcardId))
        .all(),
      reviewEvents: transaction.select().from(reviewEvents).orderBy(asc(reviewEvents.id)).all(),
    }));
  }

  async readSafetyCopyFileName(): Promise<string | null> {
    const state = this.database
      .select({ fileName: progressBackupState.safetyCopyFileName })
      .from(progressBackupState)
      .where(eq(progressBackupState.id, 1))
      .get();
    return state?.fileName ?? null;
  }

  async readInstalledDeckIds(): Promise<ReadonlySet<string>> {
    const rows = this.database.select({ id: decks.id }).from(decks).all();
    return new Set(rows.map((row) => row.id));
  }
}
