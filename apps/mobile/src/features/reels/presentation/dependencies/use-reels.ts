import type { AnswerAudioService } from "@/features/audio/domain/answer-audio.service";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";
import type { StudyService } from "@/features/study/domain/study.service";

import { useAppServices } from "@/infrastructure/app-services";

export type ReelsCapability = Readonly<{
  answerAudioService: AnswerAudioService;
  deckService: DeckService;
  reelFeedService: ReelFeedService;
  studyService: StudyService;
}>;

export function useReels(): ReelsCapability {
  const { answerAudioService, deckService, reelFeedService, studyService } = useAppServices();

  return { answerAudioService, deckService, reelFeedService, studyService };
}
