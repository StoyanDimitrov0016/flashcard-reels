import { useState } from "react";

import type { RecallLevel } from "@/features/study/domain/flashcard-review.model";

export function useRecallSession() {
  const [attemptIds, setAttemptIds] = useState<ReadonlyMap<number, string>>(() => new Map());
  const [revealedPositions, setRevealedPositions] = useState<ReadonlySet<number>>(() => new Set());
  const [recallLevels, setRecallLevels] = useState<ReadonlyMap<number, RecallLevel>>(
    () => new Map()
  );

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
