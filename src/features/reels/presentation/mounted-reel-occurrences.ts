import type {
  PreparedReelOccurrence,
  PreparedReelOccurrences,
} from "@/features/reels/domain/reel-feed";

export function mergeMountedReelOccurrences(
  existing: PreparedReelOccurrences,
  incoming: PreparedReelOccurrences
): PreparedReelOccurrences {
  const occurrencesByPosition = new Map<number, PreparedReelOccurrence>();
  for (const occurrence of existing) {
    occurrencesByPosition.set(occurrence.reelPosition, occurrence);
  }
  for (const occurrence of incoming) {
    occurrencesByPosition.set(occurrence.reelPosition, occurrence);
  }
  // oxlint-disable-next-line unicorn/no-array-sort -- ES2022 is the app's configured runtime library; this is a fresh array.
  return [...occurrencesByPosition.values()].sort(
    (left, right) => left.reelPosition - right.reelPosition
  );
}
