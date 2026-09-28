import type { Rating } from "@/features/learning-engine/domain/rating";
import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";

export interface ReviewAttemptTransaction {
  createAttempt(attempt: FlashcardReviewAttempt): Promise<void>;
  rateAttempt(
    attemptId: string,
    rating: Rating,
    updatedAt: string,
    recurrence: StudySessionRecurrence | null,
    proposedTargetReelPosition: number | null
  ): Promise<boolean>;
}
