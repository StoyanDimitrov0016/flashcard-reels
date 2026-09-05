import type { SQLiteDatabase } from "expo-sqlite";
import { z } from "zod";

import { FlashcardIdSchema } from "@/features/flashcards/domain/flashcard.model";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";

const StudySessionRecurrenceRowSchema = z.compile(
  z.object({
    consumed_at: z.string().nullable(),
    created_at: z.string(),
    flashcard_id: FlashcardIdSchema,
    id: z.string(),
    source_attempt_id: z.string(),
    study_session_id: z.string(),
    target_position: z.number().int().nonnegative(),
  })
);
type StudySessionRecurrenceRow = z.infer<typeof StudySessionRecurrenceRowSchema>;

export class SQLiteStudySessionRecurrenceRepository implements StudySessionRecurrenceRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async cancelPendingBySourceAttemptId(sourceAttemptId: string): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM study_session_recurrences WHERE source_attempt_id = ? AND consumed_at IS NULL",
      sourceAttemptId
    );
  }

  async create(recurrence: StudySessionRecurrence): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO study_session_recurrences
        (id, study_session_id, flashcard_id, source_attempt_id, target_position, created_at, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      recurrence.id,
      recurrence.studySessionId,
      recurrence.flashcardId,
      recurrence.sourceAttemptId,
      recurrence.targetPosition,
      recurrence.createdAt,
      recurrence.consumedAt
    );
  }

  async findPendingBySourceAttemptId(
    sourceAttemptId: string
  ): Promise<StudySessionRecurrence | null> {
    const row = await this.database.getFirstAsync<unknown>(
      `SELECT id, study_session_id, flashcard_id, source_attempt_id, target_position, created_at, consumed_at
       FROM study_session_recurrences
       WHERE source_attempt_id = ? AND consumed_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      sourceAttemptId
    );
    return row ? this.toModel(StudySessionRecurrenceRowSchema.parse(row)) : null;
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionRecurrence[]> {
    const rows = await this.database.getAllAsync<unknown>(
      `SELECT id, study_session_id, flashcard_id, source_attempt_id, target_position, created_at, consumed_at
       FROM study_session_recurrences
       WHERE study_session_id = ?
       ORDER BY target_position, created_at, id`,
      studySessionId
    );
    return rows.map((row) => this.toModel(StudySessionRecurrenceRowSchema.parse(row)));
  }

  async markConsumed(recurrenceId: string, consumedAt: string): Promise<boolean> {
    const result = await this.database.runAsync(
      "UPDATE study_session_recurrences SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
      consumedAt,
      recurrenceId
    );
    return result.changes > 0;
  }

  async updateTargetPosition(recurrenceId: string, targetPosition: number): Promise<boolean> {
    const result = await this.database.runAsync(
      "UPDATE study_session_recurrences SET target_position = ? WHERE id = ? AND consumed_at IS NULL",
      targetPosition,
      recurrenceId
    );
    return result.changes > 0;
  }

  private toModel(row: StudySessionRecurrenceRow): StudySessionRecurrence {
    return new StudySessionRecurrence({
      consumedAt: row.consumed_at,
      createdAt: row.created_at,
      flashcardId: row.flashcard_id,
      id: row.id,
      sourceAttemptId: row.source_attempt_id,
      studySessionId: row.study_session_id,
      targetPosition: row.target_position,
    });
  }
}
