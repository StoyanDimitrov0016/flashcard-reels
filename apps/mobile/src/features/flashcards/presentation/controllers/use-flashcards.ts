import { useEffect, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useFlashcardsCapability } from "@/features/flashcards/presentation/dependencies/use-flashcards";
import { toOperationError } from "@/shared/errors/normalize-error";

type FlashcardsState = Readonly<{
  cards: Flashcard[];
  error: Error | null;
  loading: boolean;
}>;

const initialState: FlashcardsState = { cards: [], error: null, loading: true };
type LoadedFlashcardsState = FlashcardsState &
  Readonly<{ deckId: DeckId | null; revision: number | null }>;

export function useFlashcards(deckId: DeckId | null): FlashcardsState {
  const { flashcardService } = useFlashcardsCapability();
  const { revision } = useDeckContentRevision();
  const [state, setState] = useState<LoadedFlashcardsState>({
    ...initialState,
    deckId: null,
    revision: null,
  });

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
            setState({ cards, deckId, revision, error: null, loading: false });
          }
        } catch (error) {
          if (active) {
            setState({
              cards: [],
              deckId,
              revision,
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { deckId: deckId ?? null, operation: "flashcards.load" },
                message: "Could not load flashcards",
              }),
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
    [deckId, flashcardService, revision]
  );

  // Gate during render: replacement effects have not run yet when content changes.
  if (state.deckId !== deckId || state.revision !== revision) {
    return initialState;
  }
  if (state.error) {
    throw state.error;
  }
  return state;
}
