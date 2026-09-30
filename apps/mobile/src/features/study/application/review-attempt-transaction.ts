import type { Rating } from "@/features/learning-engine/domain/rating";
import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";

export interface ReviewAttemptTransaction {
  createAttempt(attempt: FlashcardReviewAttempt): Promise<void>;
  rateAttempt(attemptId: string, rating: Rating, updatedAt: string): Promise<boolean>;
}
