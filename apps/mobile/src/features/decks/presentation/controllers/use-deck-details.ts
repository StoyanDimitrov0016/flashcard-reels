import { useEffect, useState } from "react";

import type { CardProgress } from "@/features/card-progress/domain/card-progress.model";
import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useLearningProgressReset } from "@/features/card-progress/presentation/context/learning-progress-reset-context";
import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";

type DeckDetailsState = Readonly<{
  cards: Flashcard[];
  appearance: DeckAppearance | null;
  deck: Deck | null;
  error: Error | null;
  loading: boolean;
  progress: ReadonlyMap<string, CardProgress>;
}>;

export function useDeckDetails(deckId: DeckId, enabled = true): DeckDetailsState {
  const { deckService, flashcardService, cardProgressService } = useDecks();
  const { revision } = useDeckContentRevision();
  const { revision: resetRevision } = useLearningProgressReset();
  const [state, setState] = useState<DeckDetailsState>({
    appearance: null,
    cards: [],
    deck: null,
    error: null,
    loading: true,
    progress: new Map(),
  });

  useEffect(
    function loadDeckDetails() {
      if (!enabled) {
        return undefined;
      }
      let active = true;
      void Promise.all([
        deckService.findById(deckId),
        flashcardService.listByDeckId(deckId),
        deckService.getAppearance(deckId),
      ])
        .then(async ([deck, cards, appearance]) => {
          if (!deck) {
            if (active) {
              setState({
                appearance: null,
                cards: [],
                deck: null,
                error: null,
                loading: false,
                progress: new Map(),
              });
            }
            return;
          }
          if (active) {
            const progress = await cardProgressService.findByFlashcardIds(
              cards.map((card) => card.id)
            );
            if (active) {
              setState({ appearance, cards, deck, error: null, loading: false, progress });
            }
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState({
              appearance: null,
              cards: [],
              deck: null,
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { deckId, operation: "deck-details.load" },
                message: "Could not load deck cards",
              }),
              loading: false,
              progress: new Map(),
            });
          }
        });
      return function cancelDeckDetailsLoad() {
        active = false;
      };
    },
    [deckId, deckService, enabled, flashcardService, cardProgressService, resetRevision, revision]
  );

  if (state.error) {
    throw state.error;
  }
  return state;
}
