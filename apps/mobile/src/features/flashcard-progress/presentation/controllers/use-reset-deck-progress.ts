import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

export function useResetDeckProgress(): (deckId: DeckId) => Promise<void> {
  const { flashcardProgressService } = useFlashcardProgress();
  const queryClient = useQueryClient();

  return useCallback(
    async (deckId: DeckId) => {
      await flashcardProgressService.resetDeckProgress(deckId);
      void invalidateChangedData(queryClient, ["learning-progress"]);
    },
    [queryClient, flashcardProgressService]
  );
}
