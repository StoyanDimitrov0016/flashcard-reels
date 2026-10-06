import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useReels } from "@/features/reels/presentation/dependencies/use-reels";
import {
  studyQueries,
  type FocusedSessionEvaluation,
} from "@/features/reels/presentation/queries/study-queries";

export type FocusedFeedEvaluation = FocusedSessionEvaluation;

type FocusedFeedLifecycle = Readonly<{
  /** True until the evaluation for the current deck and data has finished. */
  evaluating: boolean;
  retry: () => void;
}>;

/**
 * Evaluates whether Focus can resume: on mount, when its requested deck changes, after content or
 * progress changes (query invalidation), and whenever the app returns to the foreground. A
 * foreground evaluation keeps showing the current feed; only invalidated data marks it evaluating.
 */
export function useFocusedFeedLifecycle(
  onEvaluated: (evaluation: FocusedFeedEvaluation) => void,
  onEvaluationFailed: (error: unknown) => void,
  requestedDeckId: DeckId | null
): FocusedFeedLifecycle {
  const { data, dataUpdatedAt, error, errorUpdatedAt, isFetching, isPending, isStale, refetch } =
    useQuery(studyQueries.focusedSession(useReels(), requestedDeckId));

  useEffect(
    function evaluateWhenForegrounded() {
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          // Joins an evaluation that is already running instead of starting another.
          void refetch({ cancelRefetch: false });
        }
      });
      return function stopEvaluatingWhenForegrounded() {
        subscription.remove();
      };
    },
    [refetch]
  );
  useEffect(
    function reportEvaluation() {
      if (data && dataUpdatedAt > 0) {
        onEvaluated(data);
      }
    },
    [data, dataUpdatedAt, onEvaluated]
  );
  useEffect(
    function reportEvaluationFailure() {
      if (error && errorUpdatedAt > 0) {
        onEvaluationFailed(error);
      }
    },
    [error, errorUpdatedAt, onEvaluationFailed]
  );

  return {
    evaluating: isPending || (isFetching && isStale),
    retry: () => void refetch(),
  };
}
