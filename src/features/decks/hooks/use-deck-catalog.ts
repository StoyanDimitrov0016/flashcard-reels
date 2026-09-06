import { useEffect, useState } from "react";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import { useAppServices } from "@/infrastructure/app-services";

type DeckCatalogEntry = Readonly<{
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
        const deckIds = decks.map((deck) => deck.id);
        const [appearances, cardCounts] = await Promise.all([
          deckService.getAppearances(deckIds),
          flashcardService.countFlashcardsByDeckIds(deckIds),
        ]);
        const appearancesByDeckId = new Map(
          appearances.map((appearance) => [appearance.deckId, appearance] as const)
        );
        const entries = decks.map((deck) => {
          const appearance = appearancesByDeckId.get(deck.id);
          if (!appearance) {
            throw new Error(`Missing appearance for deck ${deck.id}`);
          }
          return { appearance, cardCount: cardCounts.get(deck.id) ?? 0, deck };
        });
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
