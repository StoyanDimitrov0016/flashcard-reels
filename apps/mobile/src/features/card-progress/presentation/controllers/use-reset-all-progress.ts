import { useCallback } from "react";

import { useLearningProgressReset } from "@/features/card-progress/presentation/context/learning-progress-reset-context";
import { useCardProgress } from "@/features/card-progress/presentation/dependencies/use-card-progress";
import { toOperationError } from "@/shared/errors/normalize-error";

type ResetAllProgressState = Readonly<{
  resetAllProgress: () => Promise<void>;
}>;

export function useResetAllProgress(): ResetAllProgressState {
  const { cardProgressService } = useCardProgress();
  const { invalidateLearningProgress } = useLearningProgressReset();

  const resetAllProgress = useCallback(async () => {
    try {
      await cardProgressService.resetAllProgress();
      invalidateLearningProgress();
    } catch (error) {
      throw toOperationError(error, {
        code: "PROGRESS_RESET_FAILED",
        context: { operation: "learning-progress.reset-all" },
        message: "The learning-progress reset could not be completed",
      });
    }
  }, [invalidateLearningProgress, cardProgressService]);

  return { resetAllProgress };
}
