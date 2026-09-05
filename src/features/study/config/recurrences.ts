import type { RecallLevel } from "@/features/study/domain/flashcard-review.model";

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
  sourcePosition: number,
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
  const targetPosition = sourcePosition + configuration.baseDistance + jitter;
  return Math.max(sourcePosition + 1, targetPosition);
}

export function findNextFreeRecurrencePosition(
  proposedPosition: number,
  sourcePosition: number,
  occupiedPositions: ReadonlySet<number>
): number {
  return findNextFreeRecurrenceSlot(
    Math.max(sourcePosition + 1, proposedPosition),
    occupiedPositions
  );
}

export function findNextFreeRecurrenceSlot(
  proposedPosition: number,
  occupiedPositions: ReadonlySet<number>
): number {
  let targetPosition = proposedPosition;
  while (occupiedPositions.has(targetPosition)) {
    targetPosition += 1;
  }
  return targetPosition;
}
