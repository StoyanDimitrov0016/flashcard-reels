import { and, eq, isNull } from "drizzle-orm";

import type { Rating } from "@/features/learning-engine/domain/rating";
import type { ReviewAttemptTransaction } from "@/features/study/application/review-attempt-transaction";
import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { flashcardReviewAttempts, studySessions } from "@/infrastructure/sqlite/schema";

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
          committedAt: attempt.committedAt,
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

  async rateAttempt(attemptId: string, rating: Rating, updatedAt: string): Promise<boolean> {
    const updated = this.database
      .update(flashcardReviewAttempts)
      .set({ ratedAt: updatedAt, rating, updatedAt })
      .where(
        and(eq(flashcardReviewAttempts.id, attemptId), isNull(flashcardReviewAttempts.committedAt))
      )
      .returning({ id: flashcardReviewAttempts.id })
      .all();
    return updated.length > 0;
  }
}
