import { useQuery } from "@tanstack/react-query";

import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import {
  flashcardProgressQueries,
  type FlashcardProgressListRow,
} from "@/features/flashcard-progress/presentation/queries/flashcard-progress-queries";
import { useRefreshOnFocus } from "@/shared/presentation/query/use-refresh-on-focus";

const emptyRows: FlashcardProgressListRow[] = [];

export function useFlashcardProgressList() {
  const { data, isPending, refetch } = useQuery(
    flashcardProgressQueries.list(useFlashcardProgress())
  );
  // Individual ratings do not invalidate progress, so a returning screen re-reads it.
  useRefreshOnFocus(refetch);

  return { rows: data ?? emptyRows, loading: isPending };
}
