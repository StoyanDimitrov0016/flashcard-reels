import { useState } from "react";

import type { RecallLevel } from "@/features/study/domain/flashcard-review.model";

export function useRecallSession() {
  const [attemptIds, setAttemptIds] = useState<ReadonlyMap<number, string>>(() => new Map());
  const [revealedCardIds, setRevealedCardIds] = useState<ReadonlySet<string>>(() => new Set());
  const [recallLevels, setRecallLevels] = useState<ReadonlyMap<string, RecallLevel>>(
    () => new Map()
  );

  const toggleCard = (cardId: string) => {
    setRevealedCardIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(cardId)) {
        nextIds.delete(cardId);
      } else {
        nextIds.add(cardId);
      }

      return nextIds;
    });
  };

  const rateCard = (cardId: string, level: RecallLevel) => {
    setRecallLevels((currentLevels) => new Map(currentLevels).set(cardId, level));
  };

  const setAttemptId = (reelPosition: number, attemptId: string) => {
    setAttemptIds((currentAttemptIds) => new Map(currentAttemptIds).set(reelPosition, attemptId));
  };

  return { attemptIds, rateCard, recallLevels, revealedCardIds, setAttemptId, toggleCard };
}
