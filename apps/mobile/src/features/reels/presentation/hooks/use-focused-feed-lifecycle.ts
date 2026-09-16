import { useEffect } from "react";
import { AppState } from "react-native";

import type { StudySession } from "@/features/study/domain/study-session.model";
import { useAppServices } from "@/infrastructure/app-services";

export function useFocusedFeedLifecycle(
  onEvaluated: (session: StudySession | null) => void,
  onEvaluationFailed: (error: unknown) => void,
  retryKey: number
): void {
  const { studyService } = useAppServices();

  useEffect(
    function synchronizeFocusedFeedLifecycle() {
      const sessionService = studyService;
      let disposed = false;
      let evaluationInFlight = false;

      const evaluate = async () => {
        if (evaluationInFlight) {
          return;
        }
        evaluationInFlight = true;
        try {
          const resumed = await sessionService.resumeFocusedSession();
          if (!disposed) {
            onEvaluated(resumed);
          }
        } catch (error) {
          if (!disposed) {
            onEvaluationFailed(error);
          }
        } finally {
          evaluationInFlight = false;
        }
      };

      void evaluate();
      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          void evaluate();
        }
      });
      return function unsubscribeFromFocusedFeedLifecycle() {
        disposed = true;
        subscription.remove();
      };
    },
    [onEvaluationFailed, onEvaluated, retryKey, studyService]
  );
}
