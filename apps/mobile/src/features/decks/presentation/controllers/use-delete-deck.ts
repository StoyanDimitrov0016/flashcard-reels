import { useEffect, useRef, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

type DeleteDeckState = Readonly<{ deleting: boolean; error: Error | null }>;

export function useDeleteDeck(): DeleteDeckState & {
  deleteDeck: (deckId: DeckId) => Promise<boolean>;
  clearDeleteError: () => void;
} {
  const { deckService } = useDecks();
  const invalidateDeckContent = useInvalidateDeckContent();
  const { invalidateLearningProgress } = useLearningProgressReset();
  const [state, setState] = useState<DeleteDeckState>({ deleting: false, error: null });
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(function ownDeckDeleteFeedbackLifetime() {
    mounted.current = true;
    return function stopDeckDeleteFeedbackOnUnmount() {
      mounted.current = false;
    };
  }, []);

  const updateDeleteState = (next: DeleteDeckState) => {
    if (mounted.current) {
      setState(next);
    }
  };

  const deleteDeck = async (deckId: DeckId) => {
    if (inFlight.current || !mounted.current) {
      return false;
    }
    inFlight.current = true;
    updateDeleteState({ deleting: true, error: null });
    try {
      await deckService.remove(deckId);
      invalidateDeckContent();
      invalidateLearningProgress();
      updateDeleteState({ deleting: false, error: null });
      return mounted.current;
    } catch (error) {
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { deckId, operation: "deck-delete" },
        message: "Could not delete deck",
      });
      reportError(normalized, "Deck delete failure");
      updateDeleteState({
        deleting: false,
        error: normalized,
      });
      return false;
    } finally {
      inFlight.current = false;
    }
  };

  return {
    ...state,
    clearDeleteError: () => {
      if (mounted.current) {
        setState((current) => ({ ...current, error: null }));
      }
    },
    deleteDeck,
  };
}
