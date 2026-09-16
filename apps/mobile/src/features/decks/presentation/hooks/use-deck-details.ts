import { useEffect, useState } from "react";

import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useAppServices } from "@/infrastructure/app-services";
import { toOperationError } from "@/shared/errors/normalize-error";

type DeckDetailsState = Readonly<{
  cards: Flashcard[];
  appearance: DeckAppearance | null;
  deck: Deck | null;
  error: Error | null;
  loading: boolean;
  profiles: ReadonlyMap<string, LearnerProfile>;
}>;

export function useDeckDetails(deckId: DeckId, enabled = true): DeckDetailsState {
  const { deckService, flashcardService, learnerProfileService } = useAppServices();
  const { revision } = useDeckContentRevision();
  const { revision: resetRevision } = useLearningProgressReset();
  const [state, setState] = useState<DeckDetailsState>({
    appearance: null,
    cards: [],
    deck: null,
    error: null,
    loading: true,
    profiles: new Map(),
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
                profiles: new Map(),
              });
            }
            return;
          }
          if (active) {
            const profiles = await learnerProfileService.findByFlashcardIds(
              cards.map((card) => card.id)
            );
            if (active) {
              setState({ appearance, cards, deck, error: null, loading: false, profiles });
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
              profiles: new Map(),
            });
          }
        });
      return function cancelDeckDetailsLoad() {
        active = false;
      };
    },
    [deckId, deckService, enabled, flashcardService, learnerProfileService, resetRevision, revision]
  );

  if (state.error) {
    throw state.error;
  }
  return state;
}
