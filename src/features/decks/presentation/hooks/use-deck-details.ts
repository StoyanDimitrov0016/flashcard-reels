import { useEffect, useState } from "react";

import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useAppServices } from "@/infrastructure/app-services";

type DeckDetailsState = Readonly<{
  cards: Flashcard[];
  deck: Deck | null;
  error: Error | null;
  loading: boolean;
}>;

export function useDeckDetails(deckId: DeckId): DeckDetailsState {
  const { deckService, flashcardService } = useAppServices();
  const [state, setState] = useState<DeckDetailsState>({
    cards: [],
    deck: null,
    error: null,
    loading: true,
  });

  useEffect(
    function loadDeckDetails() {
      let active = true;
      void Promise.all([deckService.findById(deckId), flashcardService.listByDeckId(deckId)])
        .then(([deck, cards]) => {
          if (!deck) {
            throw new Error("Deck not found");
          }
          if (active) {
            setState({ cards, deck, error: null, loading: false });
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState({
              cards: [],
              deck: null,
              error: error instanceof Error ? error : new Error("Could not load deck cards"),
              loading: false,
            });
          }
        });
      return function cancelDeckDetailsLoad() {
        active = false;
      };
    },
    [deckId, deckService, flashcardService]
  );

  if (state.error) {
    throw state.error;
  }
  return state;
}
