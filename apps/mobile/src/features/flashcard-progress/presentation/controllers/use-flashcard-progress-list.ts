import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import {
  flashcardProgressQueries,
  type FlashcardProgressListRow,
} from "@/features/flashcard-progress/presentation/queries/flashcard-progress-queries";

const emptyRows: FlashcardProgressListRow[] = [];

export function useFlashcardProgressList() {
  const { revision: progressRevision } = useLearningProgressRevision();
  const { data, isPending, refetch } = useQuery(
    flashcardProgressQueries.list(useFlashcardProgress(), progressRevision)
  );
  // Screens refresh from focus effects, so this must keep one identity across renders.
  const refresh = useCallback(() => void refetch(), [refetch]);

  return { rows: data ?? emptyRows, loading: isPending, refresh };
}
