import { and, desc, eq, isNull, ne } from "drizzle-orm";

import { findNextFreeRecurrenceSlot } from "@/features/study/config/recurrences";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { ReviewAttemptTransaction } from "@/features/study/services/review-attempt-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import {
  flashcardReviewAttempts,
  studySessionRecurrences,
  studySessions,
} from "@/infrastructure/sqlite/schema";

export class SQLiteReviewAttemptTransaction<
  TRunResult = unknown,
> implements ReviewAttemptTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async rateAttempt(
    attemptId: string,
    rating: RecallLevel,
    updatedAt: string,
    recurrence: StudySessionRecurrence | null,
    proposedTargetReelPosition: number | null
  ): Promise<boolean> {
    return this.database.transaction((transaction) => {
      const updatedAttempts = transaction
        .update(flashcardReviewAttempts)
        .set({ rating, updatedAt })
        .where(
          and(
            eq(flashcardReviewAttempts.id, attemptId),
            isNull(flashcardReviewAttempts.finalizedAt)
          )
        )
        .returning({ id: flashcardReviewAttempts.id })
        .all();

      if (updatedAttempts.length === 0) {
        return false;
      }

      if (recurrence === null || proposedTargetReelPosition === null) {
        transaction
          .delete(studySessionRecurrences)
          .where(
            and(
              eq(studySessionRecurrences.sourceAttemptId, attemptId),
              isNull(studySessionRecurrences.consumedAt)
            )
          )
          .run();
        return true;
      }

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
            eq(studySessionRecurrences.sourceAttemptId, attemptId),
            isNull(studySessionRecurrences.consumedAt)
          )
        )
        .orderBy(desc(studySessionRecurrences.createdAt), desc(studySessionRecurrences.id))
        .limit(1)
        .all();
      const existing = existingRows[0];

      const occupiedRows = transaction
        .select({ targetReelPosition: studySessionRecurrences.targetReelPosition })
        .from(studySessionRecurrences)
        .where(
          and(
            eq(studySessionRecurrences.studySessionId, recurrence.studySessionId),
            isNull(studySessionRecurrences.consumedAt),
            ne(studySessionRecurrences.sourceAttemptId, attemptId)
          )
        )
        .all();
      const targetReelPosition = findNextFreeRecurrenceSlot(
        proposedTargetReelPosition,
        new Set(occupiedRows.map((row) => row.targetReelPosition))
      );

      if (existing) {
        transaction
          .update(studySessionRecurrences)
          .set({ targetReelPosition })
          .where(
            and(
              eq(studySessionRecurrences.id, existing.id),
              isNull(studySessionRecurrences.consumedAt)
            )
          )
          .run();
      } else {
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
      }

      return true;
    });
  }
}
