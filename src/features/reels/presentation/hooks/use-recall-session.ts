import { useCallback, useEffect, useRef, useState } from "react";

import type { StudyService } from "@/features/study/domain/study.service";
import type { RecallLevel } from "@/features/study/domain/recall-level";

export function useRecallSession(
  studyService: StudyService,
  studySessionId: string,
  fromReelPosition: number,
  throughReelPosition: number
) {
  const [attemptIds, setAttemptIds] = useState<ReadonlyMap<number, string>>(() => new Map());
  const attemptIdsReference = useRef<ReadonlyMap<number, string>>(new Map());
  const [revealedPositions, setRevealedPositions] = useState<ReadonlySet<number>>(() => new Set());
  const [recallLevels, setRecallLevels] = useState<ReadonlyMap<number, RecallLevel>>(
    () => new Map()
  );
  const recallLevelsReference = useRef<ReadonlyMap<number, RecallLevel>>(new Map());

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
          recallLevelsReference.current = nextRecallLevels;
          setRecallLevels(nextRecallLevels);
        })
        .catch(() => undefined);

      return function cancelRecallSessionAttemptLoad() {
        active = false;
      };
    },
    [fromReelPosition, studyService, studySessionId, throughReelPosition]
  );

  const getAttemptId = useCallback(
    (reelPosition: number) => attemptIdsReference.current.get(reelPosition),
    []
  );

  const toggleCard = useCallback((reelPosition: number) => {
    setRevealedPositions((currentPositions) => {
      const nextPositions = new Set(currentPositions);

      if (nextPositions.has(reelPosition)) {
        nextPositions.delete(reelPosition);
      } else {
        nextPositions.add(reelPosition);
      }

      return nextPositions;
    });
  }, []);

  const rateCard = useCallback((reelPosition: number, level: RecallLevel) => {
    const nextLevels = new Map(recallLevelsReference.current).set(reelPosition, level);
    recallLevelsReference.current = nextLevels;
    setRecallLevels(nextLevels);
  }, []);

  const getRecallLevel = useCallback(
    (reelPosition: number) => recallLevelsReference.current.get(reelPosition),
    []
  );

  const setAttemptId = useCallback((reelPosition: number, attemptId: string) => {
    const nextAttemptIds = new Map(attemptIdsReference.current).set(reelPosition, attemptId);
    attemptIdsReference.current = nextAttemptIds;
    setAttemptIds(nextAttemptIds);
  }, []);

  return {
    attemptIds,
    getAttemptId,
    getRecallLevel,
    rateCard,
    recallLevels,
    revealedPositions,
    setAttemptId,
    toggleCard,
  };
}
