import { useEffect, useState } from "react";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";
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

  useEffect(() => {
    let active = true;

    async function loadAppearances() {
      try {
        const requestedDeckIds = deckIdsKey
          ? deckIdsKey.split(",").map((deckId) => DeckIdSchema.parse(deckId))
          : [];
        const appearances = await Promise.all(
          requestedDeckIds.map(async (deckId) => {
            const appearance = await deckService.getAppearance(deckId);
            if (!appearance) {
              throw new Error(`Missing appearance for deck ${deckId}`);
            }
            return [deckId, appearance] as const;
          })
        );

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
    }

    void loadAppearances();
    return () => {
      active = false;
    };
  }, [deckIdsKey, deckService]);

  if (state.error) {
    throw state.error;
  }

  return state;
}
