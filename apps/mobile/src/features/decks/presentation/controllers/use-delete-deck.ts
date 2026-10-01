import { useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";
import { useSingleFlight } from "@/shared/presentation/hooks/use-single-flight";

type DeleteDeckState = Readonly<{ deleting: boolean; error: Error | null }>;

export function useDeleteDeck(): DeleteDeckState & {
  deleteDeck: (deckId: DeckId) => Promise<boolean>;
  clearDeleteError: () => void;
} {
  const { deckService } = useDecks();
  const invalidateDeckContent = useInvalidateDeckContent();
  const { invalidateLearningProgress } = useLearningProgressRevision();
  const [state, setState] = useState<DeleteDeckState>({ deleting: false, error: null });
  const flight = useSingleFlight(deleteDeckAction);

  const updateDeleteState = (next: DeleteDeckState) => {
    if (flight.isActive()) {
      setState(next);
    }
  };

  async function deleteDeckAction(deckId: DeckId): Promise<boolean> {
    updateDeleteState({ deleting: true, error: null });
    try {
      await deckService.remove(deckId);
      invalidateDeckContent();
      invalidateLearningProgress();
      updateDeleteState({ deleting: false, error: null });
      return flight.isActive();
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
    }
  }

  return {
    ...state,
    clearDeleteError: () => {
      if (flight.isActive()) {
        setState((current) => ({ ...current, error: null }));
      }
    },
    deleteDeck: async (deckId) => (await flight.run(deckId)) ?? false,
    deleting: flight.busy,
  };
}
