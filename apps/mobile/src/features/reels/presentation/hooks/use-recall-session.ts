import { useCallback, useEffect, useRef, useState } from "react";

import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { StudyService } from "@/features/study/domain/study.service";

import { toOperationError } from "@/shared/errors/normalize-error";

export function useRecallSession(
  studyService: StudyService,
  studySessionId: string,
  fromReelPosition: number,
  throughReelPosition: number,
  initialCardState?: Readonly<{
    position: number;
    recallLevel: RecallLevel | null;
    revealed: boolean;
  }>,
  onLoadError?: (error: Error) => void
) {
  const initialRecallLevels =
    initialCardState?.recallLevel === null || initialCardState?.recallLevel === undefined
      ? new Map<number, RecallLevel>()
      : new Map([[initialCardState.position, initialCardState.recallLevel]]);
  const [attemptIds, setAttemptIds] = useState<ReadonlyMap<number, string>>(() => new Map());
  const attemptIdsReference = useRef<ReadonlyMap<number, string>>(new Map());
  const retainedRangeReference = useRef({ fromReelPosition, throughReelPosition });
  const [revealedPositions, setRevealedPositions] = useState<ReadonlySet<number>>(() =>
    initialCardState?.revealed ? new Set([initialCardState.position]) : new Set()
  );
  const revealedPositionsReference = useRef<ReadonlySet<number>>(
    initialCardState?.revealed ? new Set([initialCardState.position]) : new Set()
  );
  const [recallLevels, setRecallLevels] =
    useState<ReadonlyMap<number, RecallLevel>>(initialRecallLevels);
  const recallLevelsReference = useRef<ReadonlyMap<number, RecallLevel>>(initialRecallLevels);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(
    function trimRecallSessionToMountedRange() {
      retainedRangeReference.current = { fromReelPosition, throughReelPosition };
      const isRetained = (position: number) =>
        position >= fromReelPosition && position <= throughReelPosition;
      const nextAttemptIds = new Map(
        [...attemptIdsReference.current].filter(([position]) => isRetained(position))
      );
      const nextRecallLevels = new Map(
        [...recallLevelsReference.current].filter(([position]) => isRetained(position))
      );
      const nextRevealedPositions = new Set(
        [...revealedPositionsReference.current].filter((position) => isRetained(position))
      );
      attemptIdsReference.current = nextAttemptIds;
      recallLevelsReference.current = nextRecallLevels;
      revealedPositionsReference.current = nextRevealedPositions;
      setAttemptIds(nextAttemptIds);
      setRecallLevels(nextRecallLevels);
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
          const nextRecallLevels = new Map<number, RecallLevel>();
          for (const attempt of attempts) {
            nextAttemptIds.set(attempt.reelPosition, attempt.id);
            if (attempt.rating !== null) {
              nextRecallLevels.set(attempt.reelPosition, attempt.rating);
            }
          }
          attemptIdsReference.current = nextAttemptIds;
          setAttemptIds(nextAttemptIds);
          if (
            initialCardState?.recallLevel !== null &&
            initialCardState?.recallLevel !== undefined &&
            initialCardState.position >= fromReelPosition &&
            initialCardState.position <= throughReelPosition
          ) {
            nextRecallLevels.set(initialCardState.position, initialCardState.recallLevel);
          }
          recallLevelsReference.current = nextRecallLevels;
          setRecallLevels(nextRecallLevels);
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

  const rateCard = useCallback((reelPosition: number, level: RecallLevel) => {
    if (
      reelPosition < retainedRangeReference.current.fromReelPosition ||
      reelPosition > retainedRangeReference.current.throughReelPosition
    ) {
      return;
    }
    const nextLevels = new Map(recallLevelsReference.current).set(reelPosition, level);
    recallLevelsReference.current = nextLevels;
    setRecallLevels(nextLevels);
  }, []);

  const getRecallLevel = useCallback(
    (reelPosition: number) => recallLevelsReference.current.get(reelPosition),
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
    getRecallLevel,
    loadError,
    rateCard,
    recallLevels,
    revealedPositions,
    setAttemptId,
    toggleCard,
  };
}
