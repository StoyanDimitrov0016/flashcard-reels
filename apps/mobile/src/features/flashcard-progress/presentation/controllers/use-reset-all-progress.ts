import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import { toOperationError } from "@/shared/errors/normalize-error";
import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

type ResetAllProgressState = Readonly<{
  resetAllProgress: () => Promise<void>;
}>;

export function useResetAllProgress(): ResetAllProgressState {
  const { flashcardProgressService } = useFlashcardProgress();
  const queryClient = useQueryClient();

  const resetAllProgress = useCallback(async () => {
    try {
      await flashcardProgressService.resetAllProgress();
      void invalidateChangedData(queryClient, ["learning-progress"]);
    } catch (error) {
      throw toOperationError(error, {
        code: "PROGRESS_RESET_FAILED",
        context: { operation: "learning-progress.reset-all" },
        message: "The learning-progress reset could not be completed",
      });
    }
  }, [queryClient, flashcardProgressService]);

  return { resetAllProgress };
}
