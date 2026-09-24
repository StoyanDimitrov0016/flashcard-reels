import type { FlashcardMemoryStateRepository } from "@/features/learning-engine/domain/flashcard-memory-state.repository";
import type { LearningScheduler } from "@/features/learning-engine/domain/learning-scheduler";
import type { StudyService } from "@/features/study/domain/study.service";
import type { Clock } from "@/shared/domain/clock";

import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";

type CreateReelFeedServiceOptions = Readonly<{
  studyService: StudyService;
  flashcardMemoryStateRepository: FlashcardMemoryStateRepository;
  learningScheduler: LearningScheduler;
  clock: Clock;
}>;

export function createReelFeedService({
  studyService,
  flashcardMemoryStateRepository,
  learningScheduler,
  clock,
}: CreateReelFeedServiceOptions) {
  return new ReelFeedServiceImpl(
    studyService,
    flashcardMemoryStateRepository,
    learningScheduler,
    clock
  );
}
