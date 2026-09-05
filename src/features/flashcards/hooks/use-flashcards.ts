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

  useEffect(() => {
    let active = true;

    async function loadCards() {
      try {
        const cards = deckId
          ? await flashcardService.listByDeckId(deckId)
          : await flashcardService.list();
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
    }

    void loadCards();
    return () => {
      active = false;
    };
  }, [deckId, flashcardService]);

  if (state.error) {
    throw state.error;
  }
  return state;
}
