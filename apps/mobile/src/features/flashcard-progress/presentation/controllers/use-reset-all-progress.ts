import { useCallback } from "react";

import { useLearningProgressReset } from "@/features/flashcard-progress/presentation/context/learning-progress-reset-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import { toOperationError } from "@/shared/errors/normalize-error";

type ResetAllProgressState = Readonly<{
  resetAllProgress: () => Promise<void>;
}>;

export function useResetAllProgress(): ResetAllProgressState {
  const { flashcardProgressService } = useFlashcardProgress();
  const { invalidateLearningProgress } = useLearningProgressReset();

  const resetAllProgress = useCallback(async () => {
    try {
      await flashcardProgressService.resetAllProgress();
      invalidateLearningProgress();
    } catch (error) {
      throw toOperationError(error, {
        code: "PROGRESS_RESET_FAILED",
        context: { operation: "learning-progress.reset-all" },
        message: "The learning-progress reset could not be completed",
      });
    }
  }, [invalidateLearningProgress, flashcardProgressService]);

  return { resetAllProgress };
}
