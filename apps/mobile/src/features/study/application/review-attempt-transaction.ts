import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";

export interface ReviewAttemptTransaction {
  createAttempt(attempt: FlashcardReviewAttempt): Promise<void>;
  rateAttempt(
    attemptId: string,
    rating: RecallLevel,
    updatedAt: string,
    recurrence: StudySessionRecurrence | null,
    proposedTargetReelPosition: number | null
  ): Promise<boolean>;
}
