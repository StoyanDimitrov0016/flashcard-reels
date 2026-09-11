import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { useAppServices } from "@/infrastructure/app-services";

export function useCardAnswerAudioSource(deck: Deck | null, card: Flashcard | null) {
  const { answerAudioService } = useAppServices();
  const { preferences } = usePreferences();
  return preferences.audioEnabled && deck && card
    ? answerAudioService.findSourceForFlashcard(deck.id, deck.version, card.id, "answer")
    : null;
}
