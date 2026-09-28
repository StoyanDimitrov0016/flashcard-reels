import { useCallback, useEffect, useRef, useState } from "react";

import type { Rating } from "@/features/learning-engine/domain/rating";
import type { StudyService } from "@/features/study/domain/study.service";

import { toOperationError } from "@/shared/errors/normalize-error";

export function useRecallSession(
  studyService: StudyService,
  studySessionId: string,
  fromReelPosition: number,
  throughReelPosition: number,
  initialCardState?: Readonly<{
    position: number;
    rating: Rating | null;
    revealed: boolean;
  }>,
  onLoadError?: (error: Error) => void
) {
  const initialRatings =
    initialCardState?.rating === null || initialCardState?.rating === undefined
      ? new Map<number, Rating>()
      : new Map([[initialCardState.position, initialCardState.rating]]);
  const [attemptIds, setAttemptIds] = useState<ReadonlyMap<number, string>>(() => new Map());
  const attemptIdsReference = useRef<ReadonlyMap<number, string>>(new Map());
  const retainedRangeReference = useRef({ fromReelPosition, throughReelPosition });
  const [revealedPositions, setRevealedPositions] = useState<ReadonlySet<number>>(() =>
    initialCardState?.revealed ? new Set([initialCardState.position]) : new Set()
  );
  const revealedPositionsReference = useRef<ReadonlySet<number>>(
    initialCardState?.revealed ? new Set([initialCardState.position]) : new Set()
  );
  const [ratings, setRatings] = useState<ReadonlyMap<number, Rating>>(initialRatings);
  const ratingsReference = useRef<ReadonlyMap<number, Rating>>(initialRatings);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(
    function trimRecallSessionToMountedRange() {
      retainedRangeReference.current = { fromReelPosition, throughReelPosition };
      const isRetained = (position: number) =>
        position >= fromReelPosition && position <= throughReelPosition;
      const nextAttemptIds = new Map(
        [...attemptIdsReference.current].filter(([position]) => isRetained(position))
      );
      const nextRatings = new Map(
        [...ratingsReference.current].filter(([position]) => isRetained(position))
      );
      const nextRevealedPositions = new Set(
        [...revealedPositionsReference.current].filter((position) => isRetained(position))
      );
      attemptIdsReference.current = nextAttemptIds;
      ratingsReference.current = nextRatings;
      revealedPositionsReference.current = nextRevealedPositions;
      setAttemptIds(nextAttemptIds);
      setRatings(nextRatings);
      setRevealedPositions(nextRevealedPositions);
    },
    [fromReelPosition, throughReelPosition]
  );

  useEffect(
    function loadRecallSessionAttempts() {
      let active = true;
      void studyService
        .listReviewAttemptsInReelPositionRange(
          studySessionId,
          fromReelPosition,
          throughReelPosition
        )
        .then((attempts) => {
          if (!active) {
            return;
          }
          setLoadError(null);
          const nextAttemptIds = new Map<number, string>();
          const nextRatings = new Map<number, Rating>();
          for (const attempt of attempts) {
            nextAttemptIds.set(attempt.reelPosition, attempt.id);
            if (attempt.rating !== null) {
              nextRatings.set(attempt.reelPosition, attempt.rating);
            }
          }
          attemptIdsReference.current = nextAttemptIds;
          setAttemptIds(nextAttemptIds);
          if (
            initialCardState?.rating !== null &&
            initialCardState?.rating !== undefined &&
            initialCardState.position >= fromReelPosition &&
            initialCardState.position <= throughReelPosition
          ) {
            nextRatings.set(initialCardState.position, initialCardState.rating);
          }
          ratingsReference.current = nextRatings;
          setRatings(nextRatings);
        })
        .catch((error: unknown) => {
          if (active) {
            const normalized = toOperationError(error, {
              code: "STUDY_PERSISTENCE_FAILED",
              context: { operation: "review-attempts.load" },
              message: "Review attempts could not be loaded",
            });
            onLoadError?.(normalized);
            setLoadError(normalized);
          }
        });

      return function cancelRecallSessionAttemptLoad() {
        active = false;
      };
    },
    [
      fromReelPosition,
      initialCardState,
      onLoadError,
      studyService,
      studySessionId,
      throughReelPosition,
    ]
  );

  const getAttemptId = useCallback(
    (reelPosition: number) => attemptIdsReference.current.get(reelPosition),
    []
  );

  const toggleCard = useCallback((reelPosition: number) => {
    if (
      reelPosition < retainedRangeReference.current.fromReelPosition ||
      reelPosition > retainedRangeReference.current.throughReelPosition
    ) {
      return;
    }
    setRevealedPositions((currentPositions) => {
      const nextPositions = new Set(currentPositions);

      if (nextPositions.has(reelPosition)) {
        nextPositions.delete(reelPosition);
      } else {
        nextPositions.add(reelPosition);
      }

      revealedPositionsReference.current = nextPositions;
      return nextPositions;
    });
  }, []);

  const rateCard = useCallback((reelPosition: number, rating: Rating) => {
    if (
      reelPosition < retainedRangeReference.current.fromReelPosition ||
      reelPosition > retainedRangeReference.current.throughReelPosition
    ) {
      return;
    }
    const nextRatings = new Map(ratingsReference.current).set(reelPosition, rating);
    ratingsReference.current = nextRatings;
    setRatings(nextRatings);
  }, []);

  const getRating = useCallback(
    (reelPosition: number) => ratingsReference.current.get(reelPosition),
    []
  );

  const setAttemptId = useCallback((reelPosition: number, attemptId: string) => {
    if (
      reelPosition < retainedRangeReference.current.fromReelPosition ||
      reelPosition > retainedRangeReference.current.throughReelPosition
    ) {
      return;
    }
    const nextAttemptIds = new Map(attemptIdsReference.current).set(reelPosition, attemptId);
    attemptIdsReference.current = nextAttemptIds;
    setAttemptIds(nextAttemptIds);
  }, []);

  return {
    attemptIds,
    getAttemptId,
    getRating,
    loadError,
    rateCard,
    ratings,
    revealedPositions,
    setAttemptId,
    toggleCard,
  };
}
