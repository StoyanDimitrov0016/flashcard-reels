import type { FlashcardAudioService } from "@/features/audio/domain/flashcard-audio.service";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";
import type { StudyService } from "@/features/study/domain/study.service";

import { useAppServices } from "@/infrastructure/app-services";

export type ReelsCapability = Readonly<{
  flashcardAudioService: FlashcardAudioService;
  deckService: DeckService;
  reelFeedService: ReelFeedService;
  studyService: StudyService;
}>;

export function useReels(): ReelsCapability {
  const { flashcardAudioService, deckService, reelFeedService, studyService } = useAppServices();

  return { flashcardAudioService, deckService, reelFeedService, studyService };
}
