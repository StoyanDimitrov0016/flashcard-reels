import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { StudyFeedService } from "@/features/study/domain/study.service";

import { useAppServices } from "@/infrastructure/app-services";

export type ReelsCapability = Readonly<{
  deckService: DeckService;
  flashcardService: FlashcardService;
  studyService: StudyFeedService;
}>;

export function useReels(): ReelsCapability {
  const { deckService, flashcardService, studyService } = useAppServices();

  return { deckService, flashcardService, studyService };
}
