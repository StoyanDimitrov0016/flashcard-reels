import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useLearningProgressReset } from "@/features/card-progress/presentation/context/learning-progress-reset-context";
import { useCardProgress } from "@/features/card-progress/presentation/dependencies/use-card-progress";

export function useResetDeckProgress(): (deckId: DeckId) => Promise<void> {
  const { cardProgressService } = useCardProgress();
  const { invalidateLearningProgress } = useLearningProgressReset();

  return useCallback(
    async (deckId: DeckId) => {
      await cardProgressService.resetDeckProgress(deckId);
      invalidateLearningProgress();
    },
    [invalidateLearningProgress, cardProgressService]
  );
}
