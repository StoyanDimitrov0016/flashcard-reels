import { useEffect, useState } from "react";

import type { StudyService } from "@/features/study/services/study.service";
import type { RecallLevel } from "@/features/study/domain/recall-level";

export function useRecallSession(
  studyService: StudyService,
  studySessionId: string,
  fromReelPosition: number,
  throughReelPosition: number
) {
  const [attemptIds, setAttemptIds] = useState<ReadonlyMap<number, string>>(() => new Map());
  const [revealedPositions, setRevealedPositions] = useState<ReadonlySet<number>>(() => new Set());
  const [recallLevels, setRecallLevels] = useState<ReadonlyMap<number, RecallLevel>>(
    () => new Map()
  );

  useEffect(() => {
    let active = true;
    void studyService
      .listReviewAttemptsInReelPositionRange(studySessionId, fromReelPosition, throughReelPosition)
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
        setAttemptIds(nextAttemptIds);
        setRecallLevels(nextRecallLevels);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [fromReelPosition, studyService, studySessionId, throughReelPosition]);

  const toggleCard = (reelPosition: number) => {
    setRevealedPositions((currentPositions) => {
      const nextPositions = new Set(currentPositions);

      if (nextPositions.has(reelPosition)) {
        nextPositions.delete(reelPosition);
      } else {
        nextPositions.add(reelPosition);
      }

      return nextPositions;
    });
  };

  const rateCard = (reelPosition: number, level: RecallLevel) => {
    setRecallLevels((currentLevels) => new Map(currentLevels).set(reelPosition, level));
  };

  const setAttemptId = (reelPosition: number, attemptId: string) => {
    setAttemptIds((currentAttemptIds) => new Map(currentAttemptIds).set(reelPosition, attemptId));
  };

  return {
    attemptIds,
    rateCard,
    recallLevels,
    revealedPositions,
    setAttemptId,
    toggleCard,
  };
}
