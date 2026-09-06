import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessionRecurrences } from "@/infrastructure/sqlite/schema";

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
    return this.listBySessionIdInTargetRange(studySessionId, 0, Number.MAX_SAFE_INTEGER);
  }

  async listBySessionIdInTargetRange(
    studySessionId: string,
    fromTargetReelPosition: number,
    throughTargetReelPosition: number
  ): Promise<StudySessionRecurrence[]> {
    const rows = await this.database
      .select()
      .from(studySessionRecurrences)
      .where(
        and(
          eq(studySessionRecurrences.studySessionId, studySessionId),
          gte(studySessionRecurrences.targetReelPosition, fromTargetReelPosition),
          lte(studySessionRecurrences.targetReelPosition, throughTargetReelPosition)
        )
      )
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
