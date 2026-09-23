import { and, desc, eq, gte, isNull, ne } from "drizzle-orm";

import type { ReviewAttemptTransaction } from "@/features/study/application/review-attempt-transaction";
import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { findNextFreeRecurrenceSlot } from "@/features/study/domain/recurrences";
import {
  flashcardReviewAttempts,
  studySessionItems,
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

  async createAttempt(attempt: FlashcardReviewAttempt): Promise<void> {
    this.database.transaction((transaction) => {
      const activeSession = transaction
        .select({ id: studySessions.id })
        .from(studySessions)
        .where(and(eq(studySessions.id, attempt.studySessionId), isNull(studySessions.completedAt)))
        .limit(1)
        .all()[0];
      if (!activeSession) {
        throw new Error(
          `Cannot create a review attempt for inactive session ${attempt.studySessionId}`
        );
      }

      transaction
        .insert(flashcardReviewAttempts)
        .values({
          createdAt: attempt.createdAt,
          finalizedAt: attempt.finalizedAt,
          flashcardId: attempt.flashcardId,
          id: attempt.id,
          rating: attempt.rating,
          ratedAt: attempt.ratedAt,
          reelPosition: attempt.reelPosition,
          studySessionId: attempt.studySessionId,
          updatedAt: attempt.updatedAt,
        })
        .run();
    });
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
        .set({ ratedAt: updatedAt, rating, updatedAt })
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
            ne(studySessionRecurrences.sourceAttemptId, attemptId),
            gte(studySessionRecurrences.targetReelPosition, proposedTargetReelPosition)
          )
        )
        .all();
      const occupiedBaseRows = transaction
        .select({ reelPosition: studySessionItems.reelPosition })
        .from(studySessionItems)
        .where(
          and(
            eq(studySessionItems.studySessionId, recurrence.studySessionId),
            gte(studySessionItems.reelPosition, proposedTargetReelPosition)
          )
        )
        .all();
      const occupiedReelPositions = new Set([
        ...occupiedRows.map((row) => row.targetReelPosition),
        ...occupiedBaseRows.map((row) => row.reelPosition),
      ]);
      const targetReelPosition = findNextFreeRecurrenceSlot(
        proposedTargetReelPosition,
        occupiedReelPositions
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
