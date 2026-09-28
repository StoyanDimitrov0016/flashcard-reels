import { useEffect, useState } from "react";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { toOperationError } from "@/shared/errors/normalize-error";

type DeckDetailsState = Readonly<{
  cards: Flashcard[];
  themeSelection: DeckThemeSelection | null;
  deck: Deck | null;
  error: Error | null;
  loading: boolean;
  progress: ReadonlyMap<string, FlashcardProgress>;
}>;

export function useDeckDetails(deckId: DeckId, enabled = true): DeckDetailsState {
  const { deckService, flashcardService, flashcardProgressService } = useDecks();
  const { revision } = useDeckContentRevision();
  const { revision: progressRevision } = useLearningProgressRevision();
  const [state, setState] = useState<DeckDetailsState>({
    themeSelection: null,
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
        deckService.getThemeSelection(deckId),
      ])
        .then(async ([deck, cards, themeSelection]) => {
          if (!deck) {
            if (active) {
              setState({
                themeSelection: null,
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
            const progress = await flashcardProgressService.findByFlashcardIds(
              cards.map((card) => card.id)
            );
            if (active) {
              setState({ themeSelection, cards, deck, error: null, loading: false, progress });
            }
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState({
              themeSelection: null,
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
    [
      deckId,
      deckService,
      enabled,
      flashcardService,
      flashcardProgressService,
      progressRevision,
      revision,
    ]
  );

  if (state.error) {
    throw state.error;
  }
  return state;
}
