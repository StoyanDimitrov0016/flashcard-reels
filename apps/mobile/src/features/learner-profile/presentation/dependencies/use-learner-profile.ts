import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { LearnerProfileService } from "@/features/learner-profile/domain/learner-profile.service";

import { useAppServices } from "@/infrastructure/app-services";

export type LearnerProfileCapability = Readonly<{
  deckService: DeckService;
  flashcardService: FlashcardService;
  learnerProfileService: LearnerProfileService;
}>;

export function useLearnerProfile(): LearnerProfileCapability {
  const { deckService, flashcardService, learnerProfileService } = useAppServices();

  return { deckService, flashcardService, learnerProfileService };
}
