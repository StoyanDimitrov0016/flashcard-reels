import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useLearningProgressReset } from "@/features/flashcard-progress/presentation/context/learning-progress-reset-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";

export function useResetDeckProgress(): (deckId: DeckId) => Promise<void> {
  const { flashcardProgressService } = useFlashcardProgress();
  const { invalidateLearningProgress } = useLearningProgressReset();

  return useCallback(
    async (deckId: DeckId) => {
      await flashcardProgressService.resetDeckProgress(deckId);
      invalidateLearningProgress();
    },
    [invalidateLearningProgress, flashcardProgressService]
  );
}
