import { describe, expect, it } from "vitest";

import { mergeMountedReelOccurrences } from "@/features/reels/presentation/mounted-reel-occurrences";
import { makeFlashcard } from "../support/study-test-support";

function occurrence(reelPosition: number, cardIndex: number) {
  const card = makeFlashcard(cardIndex);
  return {
    card,
    key: `${card.id}-${reelPosition}`,
    recurrenceId: null,
    reelPosition,
  };
}

describe("mounted reel occurrence merging", () => {
  it("appends future positions without duplicating the overlap", () => {
    const result = mergeMountedReelOccurrences(
      [0, 1, 2, 3, 4, 5].map((position) => occurrence(position, position + 1)),
      [3, 4, 5, 6, 7, 8].map((position) => occurrence(position, position + 1))
    );

    expect(result.map(({ reelPosition }) => reelPosition)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("replaces a refreshed occurrence at the same absolute position", () => {
    const existing = occurrence(7, 1);
    const refreshed = occurrence(7, 2);
    const result = mergeMountedReelOccurrences([existing], [refreshed]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(refreshed);
    expect(result[0]?.card.id).toBe(makeFlashcard(2).id);
  });

  it("preserves earlier mounted occurrences when a bounded window moves forward", () => {
    const result = mergeMountedReelOccurrences(
      [0, 1, 2, 3, 4, 5].map((position) => occurrence(position, position + 1)),
      [8, 9, 10].map((position) => occurrence(position, 1))
    );

    expect(result.map(({ reelPosition }) => reelPosition)).toEqual([0, 1, 2, 3, 4, 5, 8, 9, 10]);
  });

  it("always returns ascending absolute positions with one occurrence per position", () => {
    const result = mergeMountedReelOccurrences(
      [4, 2, 4].map((position, index) => occurrence(position, index + 1)),
      [3, 2].map((position, index) => occurrence(position, index + 4))
    );

    expect(result.map(({ reelPosition }) => reelPosition)).toEqual([2, 3, 4]);
    expect(new Set(result.map(({ reelPosition }) => reelPosition)).size).toBe(result.length);
  });
});
