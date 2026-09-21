import type { FeedComposer } from "../domain/feed-composer";
import type { LearningScheduler } from "../domain/learning-scheduler";

import { SimpleFeedComposer } from "../internal/simple-feed-composer";
import { TsFsrsLearningScheduler } from "../internal/ts-fsrs-scheduler";

type RandomSource = () => number;

export function createLearningScheduler(): LearningScheduler {
  return new TsFsrsLearningScheduler();
}

export function createFeedComposer(random: RandomSource = Math.random): FeedComposer {
  return new SimpleFeedComposer(random);
}
