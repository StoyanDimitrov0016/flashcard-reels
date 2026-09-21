import type {
  PreparedReelOccurrence,
  PreparedReelOccurrences,
} from "@/features/reels/domain/reel-feed";

import { getFirstEditableReelPosition } from "@/features/reels/domain/editable-reel-position";
import { MOUNTED_REEL_HISTORY_LIMIT } from "@/features/reels/presentation/reel-runtime-config";

type MountedOccurrenceRetention = Readonly<{
  currentReelPosition: number;
  furthestReelPosition: number;
}>;

export function mergeMountedReelOccurrences(
  existing: PreparedReelOccurrences,
  incoming: PreparedReelOccurrences,
  retention: MountedOccurrenceRetention
): PreparedReelOccurrences {
  const occurrencesByPosition = new Map<number, PreparedReelOccurrence>();
  for (const occurrence of existing) {
    occurrencesByPosition.set(occurrence.reelPosition, occurrence);
  }
  for (const occurrence of incoming) {
    occurrencesByPosition.set(occurrence.reelPosition, occurrence);
  }
  const minimumMountedPosition = Math.max(
    0,
    retention.furthestReelPosition - MOUNTED_REEL_HISTORY_LIMIT
  );
  const firstEditablePosition = getFirstEditableReelPosition(retention.furthestReelPosition);
  const incomingPositions = new Set(incoming.map(({ reelPosition }) => reelPosition));

  const result = [...occurrencesByPosition.values()].filter(
    ({ reelPosition }) =>
      incomingPositions.has(reelPosition) ||
      reelPosition === retention.currentReelPosition ||
      reelPosition >= minimumMountedPosition ||
      reelPosition >= firstEditablePosition
  );
  result.sort((left, right) => left.reelPosition - right.reelPosition);
  return result;
}
