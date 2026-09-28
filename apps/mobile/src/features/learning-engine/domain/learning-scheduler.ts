import type { FlashcardMemoryState, SchedulerMemoryState } from "./flashcard-memory-state";
import type { Rating } from "./rating";

export type SchedulerReviewResult = Readonly<{
  memoryState: SchedulerMemoryState;
}>;

export interface LearningScheduler {
  review(
    flashcardId: string,
    currentState: FlashcardMemoryState | null,
    rating: Rating,
    reviewedAt: string
  ): SchedulerReviewResult;
  retrievability(state: FlashcardMemoryState, now: string): number | null;
}
