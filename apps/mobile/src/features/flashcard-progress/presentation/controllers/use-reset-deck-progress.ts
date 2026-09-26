import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";

export function useResetDeckProgress(): (deckId: DeckId) => Promise<void> {
  const { flashcardProgressService } = useFlashcardProgress();
  const { invalidateLearningProgress } = useLearningProgressRevision();

  return useCallback(
    async (deckId: DeckId) => {
      await flashcardProgressService.resetDeckProgress(deckId);
      invalidateLearningProgress();
    },
    [invalidateLearningProgress, flashcardProgressService]
  );
}
