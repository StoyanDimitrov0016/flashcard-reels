import { z } from "zod";

import { FlashcardIdSchema } from "@/features/flashcards/domain/flashcard.model";
import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import type { SQLiteDatabaseLike } from "@/infrastructure/sqlite/sqlite-database";

const StudySessionItemRowSchema = z.compile(
  z.object({
    flashcard_id: FlashcardIdSchema,
    id: z.string(),
    position: z.number().int().nonnegative(),
    study_session_id: z.string(),
  })
);
type StudySessionItemRow = z.infer<typeof StudySessionItemRowSchema>;

const INSERT_BATCH_SIZE = 200;

export class SQLiteStudySessionItemRepository implements StudySessionItemRepository {
  private readonly database: SQLiteDatabaseLike;

  constructor(database: SQLiteDatabaseLike) {
    this.database = database;
  }

  async createMany(items: readonly StudySessionItem[]): Promise<void> {
    if (items.length === 0) {
      return;
    }

    await this.database.withTransactionAsync(async () => {
      const batches = [];
      for (let offset = 0; offset < items.length; offset += INSERT_BATCH_SIZE) {
        batches.push(items.slice(offset, offset + INSERT_BATCH_SIZE));
      }

      await Promise.all(
        batches.map((batch) => {
          const placeholders = batch.map(() => "(?, ?, ?, ?)").join(", ");
          const values = batch.flatMap((item) => [
            item.id,
            item.studySessionId,
            item.flashcardId,
            item.position,
          ]);
          return this.database.runAsync(
            `INSERT INTO study_session_items (id, study_session_id, flashcard_id, position)
           VALUES ${placeholders}`,
            ...values
          );
        })
      );
    });
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionItem[]> {
    const rows = await this.database.getAllAsync(
      `SELECT id, study_session_id, flashcard_id, position
       FROM study_session_items
       WHERE study_session_id = ?
       ORDER BY position, id`,
      studySessionId
    );
    return rows.map((row) => this.toModel(StudySessionItemRowSchema.parse(row)));
  }

  private toModel(row: StudySessionItemRow): StudySessionItem {
    return new StudySessionItem({
      flashcardId: row.flashcard_id,
      id: row.id,
      position: row.position,
      studySessionId: row.study_session_id,
    });
  }
}
