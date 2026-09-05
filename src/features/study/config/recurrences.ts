import type { RecallLevel } from "@/features/study/domain/recall-level";

export type RandomSource = () => number;

export type RecurrenceConfiguration = Readonly<{
  baseDistance: number;
  jitterMaximum: number;
  jitterMinimum: number;
}>;

export const INTRA_SESSION_RECURRENCE_CONFIG: Readonly<
  Partial<Record<RecallLevel, RecurrenceConfiguration>>
> = {
  again: { baseDistance: 8, jitterMaximum: 2, jitterMinimum: -2 },
  hard: { baseDistance: 16, jitterMaximum: 4, jitterMinimum: -4 },
};

export function calculateRecurrenceTarget(
  sourceReelPosition: number,
  rating: RecallLevel,
  random: RandomSource = Math.random
): number | null {
  const configuration = INTRA_SESSION_RECURRENCE_CONFIG[rating];
  if (!configuration) {
    return null;
  }

  const jitterRange = configuration.jitterMaximum - configuration.jitterMinimum + 1;
  const jitter =
    configuration.jitterMinimum +
    Math.floor(Math.min(0.999999999, Math.max(0, random())) * jitterRange);
  const targetReelPosition = sourceReelPosition + configuration.baseDistance + jitter;
  return Math.max(sourceReelPosition + 1, targetReelPosition);
}

export function findNextFreeRecurrenceSlot(
  proposedTargetReelPosition: number,
  occupiedReelPositions: ReadonlySet<number>
): number {
  let targetReelPosition = proposedTargetReelPosition;
  while (occupiedReelPositions.has(targetReelPosition)) {
    targetReelPosition += 1;
  }
  return targetReelPosition;
}
