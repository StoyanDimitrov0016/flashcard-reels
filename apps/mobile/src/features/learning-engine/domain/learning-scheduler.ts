import type { LearnerMemoryState, SchedulerMemoryState } from "./memory-state";

export type LearningRating = "again" | "hard" | "good" | "easy";

export type SchedulerReviewResult = Readonly<{
  memoryState: SchedulerMemoryState;
}>;

export interface LearningScheduler {
  review(
    flashcardId: string,
    currentState: LearnerMemoryState | null,
    rating: LearningRating,
    reviewedAt: string
  ): SchedulerReviewResult;
  retrievability(state: LearnerMemoryState, now: string): number | null;
}
