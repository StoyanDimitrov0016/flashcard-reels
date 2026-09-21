import { useEffect, useState } from "react";
import { AppState } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession } from "@/features/study/domain/study-session.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useReels } from "@/features/reels/presentation/dependencies/use-reels";

export type FocusedFeedEvaluation = Readonly<{
  session: StudySession | null;
  requestedDeckAvailable: boolean;
}>;
type EvaluationRequest = Readonly<{
  revision: number;
  requestedDeckId: DeckId | null;
  retryKey: number;
}>;

export function useFocusedFeedLifecycle(
  onEvaluated: (evaluation: FocusedFeedEvaluation) => void,
  onEvaluationFailed: (error: unknown) => void,
  retryKey: number,
  requestedDeckId: DeckId | null
): boolean {
  const { deckService, studyService } = useReels();
  const { revision } = useDeckContentRevision();
  const [completedRequest, setCompletedRequest] = useState<EvaluationRequest | null>(null);

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
          const requestedDeckAvailable =
            requestedDeckId === null || (await deckService.findById(requestedDeckId)) !== null;
          if (!disposed) {
            onEvaluated({ session: resumed, requestedDeckAvailable });
          }
        } catch (error) {
          if (!disposed) {
            onEvaluationFailed(error);
          }
        } finally {
          evaluationInFlight = false;
          if (!disposed) {
            setCompletedRequest({ revision, requestedDeckId, retryKey });
          }
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
    [
      deckService,
      onEvaluationFailed,
      onEvaluated,
      requestedDeckId,
      retryKey,
      revision,
      studyService,
    ]
  );
  return (
    completedRequest === null ||
    completedRequest.revision !== revision ||
    completedRequest.requestedDeckId !== requestedDeckId ||
    completedRequest.retryKey !== retryKey
  );
}
