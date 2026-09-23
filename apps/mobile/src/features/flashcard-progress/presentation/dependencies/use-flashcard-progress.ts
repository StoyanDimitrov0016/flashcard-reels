import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

import { useAppServices } from "@/infrastructure/app-services";

export type FlashcardProgressCapability = Readonly<{
  deckService: DeckService;
  flashcardService: FlashcardService;
  flashcardProgressService: FlashcardProgressService;
}>;

export function useFlashcardProgress(): FlashcardProgressCapability {
  const { deckService, flashcardService, flashcardProgressService } = useAppServices();

  return { deckService, flashcardService, flashcardProgressService };
}
