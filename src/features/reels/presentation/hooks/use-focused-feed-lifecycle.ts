import { useEffect, useState } from "react";
import { AppState } from "react-native";

import type { StudySession } from "@/features/study/domain/study-session.model";
import { useAppServices } from "@/infrastructure/app-services";

type FocusLifecycleState = Readonly<{
  revision: number;
  resolved: boolean;
  session: StudySession | null;
}>;

const initialState: FocusLifecycleState = { resolved: false, revision: 0, session: null };

export function useFocusedFeedLifecycle(): FocusLifecycleState {
  const appServices = useAppServices();
  const [state, setState] = useState<FocusLifecycleState>(initialState);

  useEffect(() => {
    const studyService = appServices.studyService;
    let disposed = false;
    let evaluationInFlight = false;

    const evaluate = async () => {
      if (evaluationInFlight) {
        return;
      }
      evaluationInFlight = true;
      try {
        const resumed = await evaluateFocusedSession(studyService);
        if (!disposed) {
          setState((current) => ({
            resolved: true,
            revision: current.revision + 1,
            session: resumed,
          }));
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
    return () => {
      disposed = true;
      subscription.remove();
    };
    // eslint-disable-next-line react/exhaustive-effect-dependencies
  }, [appServices]);

  return state;
}

async function evaluateFocusedSession(
  studyService: ReturnType<typeof useAppServices>["studyService"]
): Promise<StudySession | null> {
  const activeSession = await studyService.findSessionByScope("focused");
  if (!activeSession || activeSession.deckId === null) {
    return null;
  }
  const resumed = await studyService.openSession(
    "focused",
    activeSession.deckId,
    false,
    activeSession.strategy
  );
  return resumed.session;
}
