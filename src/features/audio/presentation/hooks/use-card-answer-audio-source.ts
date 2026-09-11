import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useAppServices } from "@/infrastructure/app-services";

export function useCardAnswerAudioSource(deck: Deck | null, card: Flashcard | null) {
  const { answerAudioService } = useAppServices();
  return deck && card
    ? answerAudioService.findSourceForFlashcard(deck.id, deck.version, card.id, "answer")
    : null;
}
