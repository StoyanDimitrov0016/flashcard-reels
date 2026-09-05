import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";

import { findNextFreeRecurrenceSlot } from "@/features/study/config/recurrences";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessionRecurrences, studySessions } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionRecurrenceRepository<
  TRunResult = unknown,
> implements StudySessionRecurrenceRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async cancelPendingBySourceAttemptId(sourceAttemptId: string): Promise<void> {
    await this.database
      .delete(studySessionRecurrences)
      .where(
        and(
          eq(studySessionRecurrences.sourceAttemptId, sourceAttemptId),
          isNull(studySessionRecurrences.consumedAt)
        )
      );
  }

  async create(recurrence: StudySessionRecurrence): Promise<void> {
    await this.database.insert(studySessionRecurrences).values({
      consumedAt: recurrence.consumedAt,
      createdAt: recurrence.createdAt,
      flashcardId: recurrence.flashcardId,
      id: recurrence.id,
      sourceAttemptId: recurrence.sourceAttemptId,
      studySessionId: recurrence.studySessionId,
      targetReelPosition: recurrence.targetReelPosition,
    });
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionRecurrence[]> {
    const rows = await this.database
      .select()
      .from(studySessionRecurrences)
      .where(eq(studySessionRecurrences.studySessionId, studySessionId))
      .orderBy(
        asc(studySessionRecurrences.targetReelPosition),
        asc(studySessionRecurrences.createdAt),
        asc(studySessionRecurrences.id)
      );
    return rows.map((row) => this.toModel(row));
  }

  async markConsumed(recurrenceId: string, consumedAt: string): Promise<boolean> {
    const rows = await this.database
      .update(studySessionRecurrences)
      .set({ consumedAt })
      .where(
        and(
          eq(studySessionRecurrences.id, recurrenceId),
          isNull(studySessionRecurrences.consumedAt)
        )
      )
      .returning({ id: studySessionRecurrences.id });
    return rows.length > 0;
  }

  async schedulePending(
    recurrence: StudySessionRecurrence,
    proposedTargetReelPosition: number
  ): Promise<StudySessionRecurrence> {
    return this.database.transaction((transaction) => {
      transaction
        .update(studySessions)
        .set({ id: studySessions.id })
        .where(eq(studySessions.id, recurrence.studySessionId))
        .run();

      const existingRows = transaction
        .select()
        .from(studySessionRecurrences)
        .where(
          and(
            eq(studySessionRecurrences.sourceAttemptId, recurrence.sourceAttemptId),
            isNull(studySessionRecurrences.consumedAt)
          )
        )
        .orderBy(desc(studySessionRecurrences.createdAt), desc(studySessionRecurrences.id))
        .limit(1)
        .all();
      const existingRow = existingRows[0];

      const occupiedRows = transaction
        .select({ targetReelPosition: studySessionRecurrences.targetReelPosition })
        .from(studySessionRecurrences)
        .where(
          and(
            eq(studySessionRecurrences.studySessionId, recurrence.studySessionId),
            isNull(studySessionRecurrences.consumedAt),
            ne(studySessionRecurrences.sourceAttemptId, recurrence.sourceAttemptId)
          )
        )
        .all();
      const occupiedReelPositions = new Set(occupiedRows.map((row) => row.targetReelPosition));
      const targetReelPosition = findNextFreeRecurrenceSlot(
        proposedTargetReelPosition,
        occupiedReelPositions
      );

      if (existingRow) {
        transaction
          .update(studySessionRecurrences)
          .set({ targetReelPosition })
          .where(
            and(
              eq(studySessionRecurrences.id, existingRow.id),
              isNull(studySessionRecurrences.consumedAt)
            )
          )
          .run();
        return this.toModel({ ...existingRow, targetReelPosition });
      }

      transaction
        .insert(studySessionRecurrences)
        .values({
          consumedAt: recurrence.consumedAt,
          createdAt: recurrence.createdAt,
          flashcardId: recurrence.flashcardId,
          id: recurrence.id,
          sourceAttemptId: recurrence.sourceAttemptId,
          studySessionId: recurrence.studySessionId,
          targetReelPosition,
        })
        .run();
      return new StudySessionRecurrence({
        consumedAt: recurrence.consumedAt,
        createdAt: recurrence.createdAt,
        flashcardId: recurrence.flashcardId,
        id: recurrence.id,
        sourceAttemptId: recurrence.sourceAttemptId,
        studySessionId: recurrence.studySessionId,
        targetReelPosition,
      });
    });
  }

  private toModel(row: typeof studySessionRecurrences.$inferSelect): StudySessionRecurrence {
    return new StudySessionRecurrence({
      consumedAt: row.consumedAt,
      createdAt: row.createdAt,
      flashcardId: row.flashcardId,
      id: row.id,
      sourceAttemptId: row.sourceAttemptId,
      studySessionId: row.studySessionId,
      targetReelPosition: row.targetReelPosition,
    });
  }
}
