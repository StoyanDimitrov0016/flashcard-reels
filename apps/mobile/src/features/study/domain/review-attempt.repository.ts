import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";

export interface ReviewAttemptRepository {
  create(attempt: FlashcardReviewAttempt): Promise<void>;
  findById(attemptId: string): Promise<FlashcardReviewAttempt | null>;
  findBySessionAndReelPosition(
    studySessionId: string,
    reelPosition: number
  ): Promise<FlashcardReviewAttempt | null>;
  listBySessionAndReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<FlashcardReviewAttempt[]>;
  findMaxReelPosition(studySessionId: string): Promise<number | null>;
  listUnfinalizedBySessionId(studySessionId: string): Promise<FlashcardReviewAttempt[]>;
  listUnfinalizedBeforeReelPosition(
    studySessionId: string,
    reelPosition: number
  ): Promise<FlashcardReviewAttempt[]>;
}
