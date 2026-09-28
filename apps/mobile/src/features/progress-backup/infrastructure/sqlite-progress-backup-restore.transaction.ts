import type { ProgressBackupRestoreTransaction } from "@/features/progress-backup/application/progress-backup-restore.transaction";
import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { IdGenerator } from "@/shared/domain/id-generator";

import {
  deckProgress,
  decks,
  flashcardMemoryStates,
  flashcardProgress,
  progressBackupState,
  flashcardReviewEvents,
  studySessions,
} from "@/infrastructure/sqlite/schema";

const INSERT_CHUNK_SIZE = 25;

export class SQLiteProgressBackupRestoreTransaction<
  TRunResult = unknown,
> implements ProgressBackupRestoreTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;
  private readonly idGenerator: IdGenerator;

  constructor(database: DrizzleDatabase<TRunResult>, idGenerator: IdGenerator) {
    this.database = database;
    this.idGenerator = idGenerator;
  }

  async restore(document: ProgressBackupDocument, safetyCopyFileName?: string): Promise<void> {
    this.database.transaction((transaction) => {
      const installedDecks = transaction
        .select({ id: decks.id, title: decks.title, revision: decks.revision })
        .from(decks)
        .all();
      const installedById = new Map(installedDecks.map((deck) => [deck.id, deck]));

      // Removing sessions first cascades through attempts, items, and recurrences.
      transaction.delete(studySessions).run();
      transaction.delete(flashcardReviewEvents).run();
      transaction.delete(flashcardProgress).run();
      transaction.delete(flashcardMemoryStates).run();
      transaction.delete(deckProgress).run();

      for (let offset = 0; offset < document.deckProgress.length; offset += INSERT_CHUNK_SIZE) {
        const rows = document.deckProgress.slice(offset, offset + INSERT_CHUNK_SIZE).map((row) => {
          const installed = installedById.get(row.deckId);
          return {
            id: this.idGenerator.generate(),
            deckId: row.deckId,
            lastReviewedAt: row.lastReviewedAt,
            title: installed?.title ?? row.title,
            revision: installed?.revision ?? row.revision,
            status: installed ? ("active" as const) : ("archived" as const),
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
          .values(
            document.flashcardProgress
              .slice(offset, offset + INSERT_CHUNK_SIZE)
              .map((row) => Object.assign({ id: this.idGenerator.generate() }, row))
          )
          .run();
      }
      for (
        let offset = 0;
        offset < document.flashcardMemoryStates.length;
        offset += INSERT_CHUNK_SIZE
      ) {
        transaction
          .insert(flashcardMemoryStates)
          .values(
            document.flashcardMemoryStates
              .slice(offset, offset + INSERT_CHUNK_SIZE)
              .map((row) => Object.assign({ id: this.idGenerator.generate() }, row))
          )
          .run();
      }
      for (let offset = 0; offset < document.reviewEvents.length; offset += INSERT_CHUNK_SIZE) {
        transaction
          .insert(flashcardReviewEvents)
          .values(
            document.reviewEvents.slice(offset, offset + INSERT_CHUNK_SIZE).map((row) => ({
              id: row.id,
              deckId: row.deckId,
              flashcardId: row.flashcardId,
              rating: row.rating,
              reviewedAt: row.reviewedAt,
              committedAt: row.finalizedAt,
            }))
          )
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
