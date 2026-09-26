import type { FlashcardMemoryState, SchedulerMemoryState } from "./flashcard-memory-state";

export type LearningRating = "again" | "hard" | "good" | "easy";

export type SchedulerReviewResult = Readonly<{
  memoryState: SchedulerMemoryState;
}>;

export interface LearningScheduler {
  review(
    flashcardId: string,
    currentState: FlashcardMemoryState | null,
    rating: LearningRating,
    reviewedAt: string
  ): SchedulerReviewResult;
  retrievability(state: FlashcardMemoryState, now: string): number | null;
}
