import { useEffect, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useAppServices } from "@/infrastructure/app-services";

type FlashcardsState = Readonly<{
  cards: Flashcard[];
  error: Error | null;
  loading: boolean;
}>;

const initialState: FlashcardsState = { cards: [], error: null, loading: true };

export function useFlashcards(deckId: DeckId | null): FlashcardsState {
  const { flashcardService } = useAppServices();
  const [state, setState] = useState<FlashcardsState>(initialState);

  useEffect(
    function loadFlashcards() {
      let active = true;

      const loadCards = async () => {
        try {
          let cards: Flashcard[];
          if (deckId) {
            cards = await flashcardService.listByDeckId(deckId);
          } else {
            cards = await flashcardService.list();
          }
          if (active) {
            setState({ cards, error: null, loading: false });
          }
        } catch (error) {
          if (active) {
            setState({
              cards: [],
              error: error instanceof Error ? error : new Error("Could not load flashcards"),
              loading: false,
            });
          }
        }
      };

      void loadCards();
      return function cancelFlashcardLoad() {
        active = false;
      };
    },
    [deckId, flashcardService]
  );

  if (state.error) {
    throw state.error;
  }
  return state;
}
