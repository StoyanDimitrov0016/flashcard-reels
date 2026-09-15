import { useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useAppServices } from "@/infrastructure/app-services";

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
      setState({
        deleting: false,
        error: error instanceof Error ? error : new Error("Could not delete deck"),
      });
      return false;
    }
  };

  return { ...state, deleteDeck };
}
