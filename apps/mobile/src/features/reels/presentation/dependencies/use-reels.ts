import type { DeckService } from "@/features/decks/domain/deck.service";
import type { StudyFeedService } from "@/features/study/domain/study.service";

import { useAppServices } from "@/infrastructure/app-services";

export type ReelsCapability = Readonly<{
  deckService: DeckService;
  studyService: StudyFeedService;
}>;

export function useReels(): ReelsCapability {
  const { deckService, studyService } = useAppServices();

  return { deckService, studyService };
}
