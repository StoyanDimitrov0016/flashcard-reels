import { describe, expect, it } from "vitest";

import {
  completeReelActivation,
  shouldCompactSessionRuntimeData,
} from "@/features/reels/application/reel-position-extension";
import { getLocalReelIndex } from "@/features/reels/presentation/hooks/use-reel-feed";

describe("absolute reel position mapping", () => {
  it("clamps the persisted position into the loaded window", () => {
    expect(getLocalReelIndex(5_000, 4_950, 151)).toBe(50);
    expect(getLocalReelIndex(4_900, 4_950, 151)).toBe(0);
    expect(getLocalReelIndex(5_200, 4_950, 151)).toBe(150);
  });

  it("keeps the same absolute occurrence when the window origin shifts", () => {
    expect(getLocalReelIndex(5_000, 4_950, 11)).toBe(10);
    expect(getLocalReelIndex(5_000, 4_991, 11)).toBe(9);
    expect(getLocalReelIndex(5_000, 5_000, 11)).toBe(0);
  });
});

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

describe("reel activation ordering", () => {
  it("runs persistence, recurrence, visibility, ratings, finalization, compaction, and extension", async () => {
    const events: string[] = [];
    const record = (event: string) => async () => {
      events.push(event);
    };

    await completeReelActivation(
      async () => {
        events.push("position");
        return true;
      },
      record("recurrence"),
      record("visible"),
      record("finalization"),
      record("compaction"),
      record("extension"),
      record("ratings")
    );

    expect(events).toEqual([
      "position",
      "recurrence",
      "visible",
      "ratings",
      "finalization",
      "compaction",
      "extension",
    ]);
  });

  it("stops when position persistence fails", async () => {
    const effect = async () => {
      throw new Error("must not run");
    };
    await expect(
      completeReelActivation(async () => false, effect, effect, effect, effect, effect, effect)
    ).resolves.toBe(false);
  });
});
