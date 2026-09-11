import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useAppServices } from "@/infrastructure/app-services";

export function useResetDeckProgress(): (deckId: DeckId) => Promise<void> {
  const { learnerProfileService } = useAppServices();
  const { invalidateLearningProgress } = useLearningProgressReset();

  return useCallback(
    async (deckId: DeckId) => {
      await learnerProfileService.resetDeckProgress(deckId);
      invalidateLearningProgress();
    },
    [invalidateLearningProgress, learnerProfileService]
  );
}
