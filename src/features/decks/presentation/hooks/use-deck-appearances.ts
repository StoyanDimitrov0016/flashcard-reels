import { useEffect, useState } from "react";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { DeckIdSchema } from "@/features/decks/contracts/deck.schema";
import type { DeckId } from "@/features/decks/domain/deck.model";
import { useAppServices } from "@/infrastructure/app-services";

type DeckAppearancesState = Readonly<{
  appearances: ReadonlyMap<DeckId, DeckAppearance>;
  error: Error | null;
  loading: boolean;
}>;

const initialState: DeckAppearancesState = { appearances: new Map(), error: null, loading: true };

export function useDeckAppearances(deckIds: DeckId[]): DeckAppearancesState {
  const { deckService } = useAppServices();
  const [state, setState] = useState<DeckAppearancesState>(initialState);
  const deckIdsKey = deckIds.join(",");

  useEffect(
    function loadDeckAppearances() {
      let active = true;

      const loadAppearances = async () => {
        try {
          const requestedDeckIds = deckIdsKey
            ? deckIdsKey.split(",").map((deckId) => DeckIdSchema.parse(deckId))
            : [];
          const loadedAppearances = await deckService.getAppearances(requestedDeckIds);
          const appearancesByDeckId = new Map(
            loadedAppearances.map((appearance) => [appearance.deckId, appearance] as const)
          );
          const appearances = requestedDeckIds.map((deckId) => {
            const appearance = appearancesByDeckId.get(deckId);
            if (!appearance) {
              throw new Error(`Missing appearance for deck ${deckId}`);
            }
            return [deckId, appearance] as const;
          });

          if (active) {
            setState({ appearances: new Map(appearances), error: null, loading: false });
          }
        } catch (error) {
          if (active) {
            setState({
              appearances: new Map(),
              error: error instanceof Error ? error : new Error("Could not load deck appearances"),
              loading: false,
            });
          }
        }
      };

      void loadAppearances();
      return function cancelDeckAppearanceLoad() {
        active = false;
      };
    },
    [deckIdsKey, deckService]
  );

  if (state.error) {
    throw state.error;
  }

  return state;
}
