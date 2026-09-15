import type { FeedComposer } from "./domain/feed-composer";
import type { LearningScheduler } from "./domain/learning-scheduler";
import { SimpleFeedComposer, type RandomSource } from "./internal/simple-feed-composer";
import { TsFsrsLearningScheduler } from "./internal/ts-fsrs-scheduler";

export type {
  FeedCandidate,
  FeedChoice,
  FeedComposer,
  FeedComposerInput,
  FeedState,
} from "./domain/feed-composer";
export { FEED_RECENT_CARD_LIMIT, rememberCard } from "./domain/feed-composer";
export type { LearnerMemoryState, MemoryState, SchedulerMemoryState } from "./domain/memory-state";
export type { FlashcardMemoryStateRepository } from "./domain/flashcard-memory-state.repository";
export type {
  LearningRating,
  LearningScheduler,
  SchedulerReviewResult,
} from "./domain/learning-scheduler";
export type { StudyScope } from "./domain/study-scope";

export function createLearningScheduler(): LearningScheduler {
  return new TsFsrsLearningScheduler();
}

export function createFeedComposer(random: RandomSource = Math.random): FeedComposer {
  return new SimpleFeedComposer(random);
}
