import { describe, expect, it } from "vitest";

import {
  getReelRotationValue,
  shouldSynchronizeReelRotation,
} from "@/features/reels/presentation/reel-rotation";

describe("reel rotation projection", () => {
  it("projects authoritative revealed state directly to a face value", () => {
    expect(getReelRotationValue(false)).toBe(0);
    expect(getReelRotationValue(true)).toBe(1);
  });

  it("does not interrupt a local double-tap animation when its state arrives", () => {
    expect(shouldSynchronizeReelRotation(false, true, true, true)).toBe(false);
  });

  it("synchronizes an externally changed state or recycled occurrence", () => {
    expect(shouldSynchronizeReelRotation(false, true, false, true)).toBe(true);
    expect(shouldSynchronizeReelRotation(true, false, false, false)).toBe(true);
  });
});
