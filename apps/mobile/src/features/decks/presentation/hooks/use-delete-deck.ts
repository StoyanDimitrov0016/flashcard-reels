import { useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useAppServices } from "@/infrastructure/app-services";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/presentation/errors/report-error";

type DeleteDeckState = Readonly<{ deleting: boolean; error: Error | null }>;

export function useDeleteDeck(): DeleteDeckState & {
  deleteDeck: (deckId: DeckId) => Promise<boolean>;
} {
  const { deckService } = useAppServices();
  const invalidateDeckContent = useInvalidateDeckContent();
  const { invalidateLearningProgress } = useLearningProgressReset();
  const [state, setState] = useState<DeleteDeckState>({ deleting: false, error: null });

  const deleteDeck = async (deckId: DeckId) => {
    setState({ deleting: true, error: null });
    try {
      await deckService.remove(deckId);
      invalidateDeckContent();
      invalidateLearningProgress();
      setState({ deleting: false, error: null });
      return true;
    } catch (error) {
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { deckId, operation: "deck-delete" },
        message: "Could not delete deck",
      });
      reportError(normalized, "Deck delete failure");
      setState({
        deleting: false,
        error: normalized,
      });
      return false;
    }
  };

  return { ...state, deleteDeck };
}
