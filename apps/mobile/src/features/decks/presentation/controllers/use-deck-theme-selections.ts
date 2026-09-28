import { useEffect, useState } from "react";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { DeckId } from "@/features/decks/domain/deck.model";

import { DeckIdSchema } from "@/features/decks/contracts/deck.schema";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { OperationError } from "@/shared/errors/operation-error";

type DeckThemeSelectionsState = Readonly<{
  themeSelections: ReadonlyMap<DeckId, DeckThemeSelection>;
  error: Error | null;
  loading: boolean;
}>;

const initialState: DeckThemeSelectionsState = {
  themeSelections: new Map(),
  error: null,
  loading: true,
};

export function useDeckThemeSelections(deckIds: DeckId[]): DeckThemeSelectionsState {
  const { deckService } = useDecks();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const [state, setState] = useState<DeckThemeSelectionsState>(initialState);
  const deckIdsKey = deckIds.join(",");

  useEffect(
    function loadDeckThemeSelections() {
      let active = true;

      const loadThemeSelections = async () => {
        try {
          const requestedDeckIds = deckIdsKey
            ? deckIdsKey.split(",").map((deckId) => DeckIdSchema.parse(deckId))
            : [];
          const loadedThemeSelections = await deckService.getThemeSelections(requestedDeckIds);
          const themeSelectionsByDeckId = new Map(
            loadedThemeSelections.map(
              (themeSelection) => [themeSelection.deckId, themeSelection] as const
            )
          );
          const themeSelections = requestedDeckIds.map((deckId) => {
            const themeSelection = themeSelectionsByDeckId.get(deckId);
            if (!themeSelection) {
              throw new OperationError({
                code: "VIEW_LOAD_FAILED",
                context: { deckId, operation: "deck-theme-selections.load" },
                message: `Missing theme selection for deck ${deckId}`,
              });
            }
            return [deckId, themeSelection] as const;
          });

          if (active) {
            setState({ themeSelections: new Map(themeSelections), error: null, loading: false });
          }
        } catch (error) {
          if (active) {
            setState({
              themeSelections: new Map(),
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "deck-theme-selections.load" },
                message: "Could not load deck theme selections",
              }),
              loading: false,
            });
          }
        }
      };

      void loadThemeSelections();
      return function cancelDeckThemeSelectionLoad() {
        active = false;
      };
    },
    [themeSelectionRevision, deckIdsKey, deckService]
  );

  if (state.error) {
    throw state.error;
  }

  return state;
}
