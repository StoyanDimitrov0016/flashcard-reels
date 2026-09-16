import { useCallback } from "react";

import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useAppServices } from "@/infrastructure/app-services";
import { toOperationError } from "@/shared/errors/normalize-error";

type ResetAllProgressState = Readonly<{
  resetAllProgress: () => Promise<void>;
}>;

export function useResetAllProgress(): ResetAllProgressState {
  const { learnerProfileService } = useAppServices();
  const { invalidateLearningProgress } = useLearningProgressReset();

  const resetAllProgress = useCallback(async () => {
    try {
      await learnerProfileService.resetAllProgress();
      invalidateLearningProgress();
    } catch (error) {
      throw toOperationError(error, {
        code: "PROGRESS_RESET_FAILED",
        context: { operation: "learning-progress.reset-all" },
        message: "The learning-progress reset could not be completed",
      });
    }
  }, [invalidateLearningProgress, learnerProfileService]);

  return { resetAllProgress };
}
