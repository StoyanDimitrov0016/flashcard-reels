import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { RecallLevel } from "@/features/study/domain/flashcard-review.model";

export interface ReviewAttemptRepository {
  create(attempt: FlashcardReviewAttempt): Promise<void>;
  updateRating(attemptId: string, rating: RecallLevel, updatedAt: string): Promise<boolean>;
  finalize(attemptId: string, finalizedAt: string, updatedAt: string): Promise<void>;
  findById(attemptId: string): Promise<FlashcardReviewAttempt | null>;
  listUnfinalizedBeforeReelPosition(reelPosition: number): Promise<FlashcardReviewAttempt[]>;
}
