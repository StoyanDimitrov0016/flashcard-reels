import type { ProgressBackupRestoreTransaction } from "@/features/progress-backup/application/progress-backup-restore.transaction";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  deckProgress,
  decks,
  flashcardMemoryStates,
  flashcardProgress,
  progressBackupState,
  reviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

const INSERT_CHUNK_SIZE = 25;

export class SQLiteProgressBackupRestoreTransaction<
  TRunResult = unknown,
> implements ProgressBackupRestoreTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async restore(document: ProgressBackupDocument, safetyCopyFileName?: string): Promise<void> {
    this.database.transaction((transaction) => {
      const installedDecks = transaction
        .select({ id: decks.id, title: decks.title, version: decks.version })
        .from(decks)
        .all();
      const installedById = new Map(installedDecks.map((deck) => [deck.id, deck]));

      // Removing sessions first cascades through attempts, items, and recurrences.
      transaction.delete(studySessions).run();
      transaction.delete(reviewEvents).run();
      transaction.delete(flashcardProgress).run();
      transaction.delete(flashcardMemoryStates).run();
      transaction.delete(deckProgress).run();

      for (let offset = 0; offset < document.deckProgress.length; offset += INSERT_CHUNK_SIZE) {
        const rows = document.deckProgress.slice(offset, offset + INSERT_CHUNK_SIZE).map((row) => {
          const installed = installedById.get(row.deckId);
          return {
            deckId: row.deckId,
            lastReviewedAt: row.lastReviewedAt,
            title: installed?.title ?? row.title,
            version: installed?.version ?? row.version,
            resolution: installed ? ("active" as const) : ("archived" as const),
          };
        });
        transaction.insert(deckProgress).values(rows).run();
      }
      for (
        let offset = 0;
        offset < document.flashcardProgress.length;
        offset += INSERT_CHUNK_SIZE
      ) {
        transaction
          .insert(flashcardProgress)
          .values(document.flashcardProgress.slice(offset, offset + INSERT_CHUNK_SIZE))
          .run();
      }
      for (
        let offset = 0;
        offset < document.flashcardMemoryStates.length;
        offset += INSERT_CHUNK_SIZE
      ) {
        transaction
          .insert(flashcardMemoryStates)
          .values(document.flashcardMemoryStates.slice(offset, offset + INSERT_CHUNK_SIZE))
          .run();
      }
      for (let offset = 0; offset < document.reviewEvents.length; offset += INSERT_CHUNK_SIZE) {
        transaction
          .insert(reviewEvents)
          .values(document.reviewEvents.slice(offset, offset + INSERT_CHUNK_SIZE))
          .run();
      }
      if (safetyCopyFileName) {
        transaction
          .insert(progressBackupState)
          .values({ id: 1, safetyCopyFileName })
          .onConflictDoUpdate({
            target: progressBackupState.id,
            set: { safetyCopyFileName },
          })
          .run();
      }
    });
  }
}
