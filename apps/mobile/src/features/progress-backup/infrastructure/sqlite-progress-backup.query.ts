import { asc } from "drizzle-orm";

import type { ProgressBackupQuery } from "@/features/progress-backup/application/progress-backup.query";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  flashcardMemoryStates,
  flashcardProgress,
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
}
