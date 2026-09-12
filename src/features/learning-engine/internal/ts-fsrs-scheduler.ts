import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";

import type {
  LearningRating,
  LearningScheduler,
  SchedulerReviewResult,
} from "../domain/learning-scheduler";
import type { LearnerMemoryState, SchedulerMemoryState } from "../domain/memory-state";

const scheduler = fsrs({
  enable_fuzz: false,
  enable_short_term: false,
});

const ratingMap: Readonly<Record<LearningRating, Grade>> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const stateMap: Readonly<Record<State, SchedulerMemoryState["state"]>> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

export class TsFsrsLearningScheduler implements LearningScheduler {
  review(
    flashcardId: string,
    currentState: LearnerMemoryState | null,
    rating: LearningRating,
    reviewedAt: string
  ): SchedulerReviewResult {
    const reviewDate = new Date(reviewedAt);
    const result = scheduler.next(
      currentState ? toFsrsCard(currentState) : createEmptyCard(reviewDate),
      reviewDate,
      ratingMap[rating]
    );
    return { memoryState: toMemoryState(flashcardId, result.card) };
  }

  retrievability(state: LearnerMemoryState, now: string): number | null {
    if (state.lastReviewAt === null || state.state === "new" || state.reps === 0) {
      return null;
    }
    return scheduler.get_retrievability(toFsrsCard(state), new Date(now), false);
  }
}

function toFsrsCard(state: LearnerMemoryState): Card {
  return {
    due: new Date(state.dueAt),
    stability: state.stability,
    difficulty: state.difficulty,
    // ts-fsrs 5 requires this deprecated field until its version 6 Card shape lands.
    // oxlint-disable-next-line typescript/no-deprecated
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: toFsrsState(state.state),
    ...(state.lastReviewAt ? { last_review: new Date(state.lastReviewAt) } : {}),
  };
}

function toFsrsState(state: SchedulerMemoryState["state"]): State {
  switch (state) {
    case "new":
      return State.New;
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearning":
      return State.Relearning;
    default:
      throw new Error("Unknown memory state");
  }
}

function toMemoryState(flashcardId: string, card: Card): SchedulerMemoryState {
  // ts-fsrs 5 still returns this deprecated field as its scheduler-computed interval.
  // oxlint-disable-next-line typescript/no-deprecated
  const elapsedDays = card.elapsed_days;
  return {
    dueAt: card.due.toISOString(),
    difficulty: card.difficulty,
    elapsedDays: Math.max(0, Math.trunc(elapsedDays)),
    flashcardId,
    lapses: Math.max(0, Math.trunc(card.lapses)),
    lastReviewAt: card.last_review?.toISOString() ?? null,
    learningSteps: Math.max(0, Math.trunc(card.learning_steps)),
    reps: Math.max(0, Math.trunc(card.reps)),
    scheduledDays: Math.max(0, Math.trunc(card.scheduled_days)),
    stability: card.stability,
    state: stateMap[card.state],
  };
}
