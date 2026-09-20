import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useLearnerProfile } from "@/features/learner-profile/presentation/dependencies/use-learner-profile";

export function useResetDeckProgress(): (deckId: DeckId) => Promise<void> {
  const { learnerProfileService } = useLearnerProfile();
  const { invalidateLearningProgress } = useLearningProgressReset();

  return useCallback(
    async (deckId: DeckId) => {
      await learnerProfileService.resetDeckProgress(deckId);
      invalidateLearningProgress();
    },
    [invalidateLearningProgress, learnerProfileService]
  );
}
