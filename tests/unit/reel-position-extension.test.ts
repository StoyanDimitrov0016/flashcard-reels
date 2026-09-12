import { describe, expect, it } from "vitest";

import { shouldCompactSessionRuntimeData } from "@/features/reels/application/reel-position-extension";

describe("session runtime compaction eligibility", () => {
  it.each([
    [24, 24, false],
    [24, 25, true],
    [25, 26, false],
    [49, 50, true],
    [24, 51, true],
    [51, 30, false],
  ] as const)("maps progress from %i to %i to %s", (previous, next, expected) => {
    expect(shouldCompactSessionRuntimeData(previous, next)).toBe(expected);
  });
});
