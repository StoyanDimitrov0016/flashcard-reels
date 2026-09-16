import { useEffect, useState } from "react";

import { DeckIdSchema } from "@/features/decks/contracts/deck.schema";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import { useAppServices } from "@/infrastructure/app-services";
import { OperationError } from "@/shared/errors/operation-error";
import { toOperationError } from "@/shared/errors/normalize-error";

type DecksState = Readonly<{
  decks: ReadonlyMap<DeckId, Deck>;
  error: Error | null;
  loading: boolean;
}>;

const initialState: DecksState = { decks: new Map(), error: null, loading: true };

export function useDecks(deckIds: DeckId[]): DecksState {
  const { deckService } = useAppServices();
  const [state, setState] = useState<DecksState>(initialState);
  const deckIdsKey = deckIds.join(",");

  useEffect(
    function loadDecksById() {
      let active = true;

      const loadDecks = async () => {
        try {
          const requestedDeckIds = deckIdsKey
            ? deckIdsKey.split(",").map((deckId) => DeckIdSchema.parse(deckId))
            : [];
          const loadedDecks = await deckService.findByIds(requestedDeckIds);
          const decksById = new Map(loadedDecks.map((deck) => [deck.id, deck] as const));
          const decks = requestedDeckIds.map((deckId) => {
            const deck = decksById.get(deckId);
            if (!deck) {
              throw new OperationError({
                code: "DECK_NOT_FOUND",
                context: { deckId, operation: "decks.load" },
                message: `Missing deck ${deckId}`,
              });
            }
            return [deckId, deck] as const;
          });

          if (active) {
            setState({ decks: new Map(decks), error: null, loading: false });
          }
        } catch (error) {
          if (active) {
            setState({
              decks: new Map(),
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "decks.load" },
                message: "Could not load decks",
              }),
              loading: false,
            });
          }
        }
      };

      void loadDecks();
      return function cancelDeckLoad() {
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
