import { useAppServices } from "@/infrastructure/app-services";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";
import type { StudyService } from "@/features/study/domain/study.service";

export type ReelsCapability = Readonly<{
  deckService: DeckService;
  reelFeedService: ReelFeedService;
  studyService: StudyService;
}>;

export function useReels(): ReelsCapability {
  const { deckService, reelFeedService, studyService } = useAppServices();

  return { deckService, reelFeedService, studyService };
}
