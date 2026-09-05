import { useEffect, useState } from "react";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import { useAppServices } from "@/infrastructure/app-services";

export type DeckCatalogEntry = Readonly<{
  appearance: DeckAppearance;
  cardCount: number;
  deck: Deck;
}>;

type DeckCatalogState = Readonly<{
  entries: DeckCatalogEntry[];
  error: Error | null;
  loading: boolean;
}>;

const initialState: DeckCatalogState = { entries: [], error: null, loading: true };

export function useDeckCatalog(): DeckCatalogState {
  const { deckService, flashcardService } = useAppServices();
  const [state, setState] = useState<DeckCatalogState>(initialState);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const decks = await deckService.list();
        const entries = await Promise.all(
          decks.map(async (deck) => {
            const [appearance, cards] = await Promise.all([
              deckService.getAppearance(deck.id),
              flashcardService.listByDeckId(deck.id),
            ]);
            if (!appearance) {
              throw new Error(`Missing appearance for deck ${deck.id}`);
            }
            return { appearance, cardCount: cards.length, deck };
          })
        );
        if (active) {
          setState({ entries, error: null, loading: false });
        }
      } catch (error) {
        if (active) {
          setState({
            entries: [],
            error: error instanceof Error ? error : new Error("Could not load decks"),
            loading: false,
          });
        }
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, [deckService, flashcardService]);

  if (state.error) {
    throw state.error;
  }
  return state;
}
