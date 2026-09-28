import { useEffect, useState } from "react";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck } from "@/features/decks/domain/deck.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { OperationError } from "@/shared/errors/operation-error";

type DeckCatalogEntry = Readonly<{
  themeSelection: DeckThemeSelection;
  cardCount: number;
  deck: Deck;
}>;

type DeckCatalogState = Readonly<{
  entries: DeckCatalogEntry[];
  error: Error | null;
  loading: boolean;
}>;

const initialState: DeckCatalogState = { entries: [], error: null, loading: true };

export function useDeckCatalog(): DeckCatalogState & { refresh: () => void } {
  const { deckService, flashcardService } = useDecks();
  const { revision: contentRevision } = useDeckContentRevision();
  const [state, setState] = useState<DeckCatalogState>(initialState);
  const [revision, setRevision] = useState(0);

  useEffect(
    function loadDeckCatalog() {
      let active = true;

      const loadCatalog = async () => {
        try {
          const decks = await deckService.list();
          const deckIds = decks.map((deck) => deck.id);
          const [themeSelections, cardCounts] = await Promise.all([
            deckService.getThemeSelections(deckIds),
            flashcardService.countFlashcardsByDeckIds(deckIds),
          ]);
          const themeSelectionsByDeckId = new Map(
            themeSelections.map(
              (themeSelection) => [themeSelection.deckId, themeSelection] as const
            )
          );
          const entries = decks.map((deck) => {
            const themeSelection = themeSelectionsByDeckId.get(deck.id);
            if (!themeSelection) {
              throw new OperationError({
                code: "VIEW_LOAD_FAILED",
                context: { deckId: deck.id, operation: "deck-catalog.load" },
                message: `Missing theme selection for deck ${deck.id}`,
              });
            }
            return { themeSelection, cardCount: cardCounts.get(deck.id) ?? 0, deck };
          });
          if (active) {
            setState({ entries, error: null, loading: false });
          }
        } catch (error) {
          if (active) {
            setState({
              entries: [],
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "deck-catalog.load" },
                message: "Could not load decks",
              }),
              loading: false,
            });
          }
        }
      };

      void loadCatalog();
      return function cancelDeckCatalogLoad() {
        active = false;
      };
    },
    [contentRevision, deckService, flashcardService, revision]
  );

  if (state.error) {
    throw state.error;
  }
  return { ...state, refresh: () => setRevision((current) => current + 1) };
}
