import type { CardProgressService } from "@/features/card-progress/domain/card-progress.service";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

import { useAppServices } from "@/infrastructure/app-services";

export type CardProgressCapability = Readonly<{
  deckService: DeckService;
  flashcardService: FlashcardService;
  cardProgressService: CardProgressService;
}>;

export function useCardProgress(): CardProgressCapability {
  const { deckService, flashcardService, cardProgressService } = useAppServices();

  return { deckService, flashcardService, cardProgressService };
}
