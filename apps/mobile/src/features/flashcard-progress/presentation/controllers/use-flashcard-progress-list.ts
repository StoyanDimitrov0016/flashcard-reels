import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import {
  flashcardProgressQueries,
  type FlashcardProgressListRow,
} from "@/features/flashcard-progress/presentation/queries/flashcard-progress-queries";
import { toOperationError } from "@/shared/errors/normalize-error";

const emptyRows: FlashcardProgressListRow[] = [];

export function useFlashcardProgressList() {
  const { deckService, flashcardService, flashcardProgressService } = useFlashcardProgress();
  const { revision: progressRevision } = useLearningProgressRevision();
  const { data, error, isPending, refetch } = useQuery(
    flashcardProgressQueries.list({
      deckService,
      flashcardService,
      flashcardProgressService,
      progressRevision,
    })
  );
  // Screens refresh from focus effects, so this must keep one identity across renders.
  const refresh = useCallback(() => void refetch(), [refetch]);
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { operation: "flashcard-progress-list.load" },
      message: "Could not load progress",
    });
  }

  return { rows: data ?? emptyRows, error: null, loading: isPending, refresh };
}
