import { useEffect, useState } from "react";

import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import { useAppServices } from "@/infrastructure/app-services";

type DeckDetailsState = Readonly<{
  cards: Flashcard[];
  appearance: DeckAppearance | null;
  deck: Deck | null;
  error: Error | null;
  loading: boolean;
  profiles: ReadonlyMap<string, LearnerProfile>;
}>;

export function useDeckDetails(deckId: DeckId): DeckDetailsState {
  const { deckService, flashcardService, learnerProfileService } = useAppServices();
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
      let active = true;
      void Promise.all([
        deckService.findById(deckId),
        flashcardService.listByDeckId(deckId),
        deckService.getAppearance(deckId),
      ])
        .then(async ([deck, cards, appearance]) => {
          if (!deck) {
            throw new Error("Deck not found");
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
              error: error instanceof Error ? error : new Error("Could not load deck cards"),
              loading: false,
              profiles: new Map(),
            });
          }
        });
      return function cancelDeckDetailsLoad() {
        active = false;
      };
    },
    [deckId, deckService, flashcardService, learnerProfileService]
  );

  if (state.error) {
    throw state.error;
  }
  return state;
}
