import { describe, expect, it } from "vitest";

import { getReelRotationValue } from "@/features/reels/presentation/reel-rotation";

describe("reel rotation projection", () => {
  it("projects authoritative revealed state directly to a face value", () => {
    expect(getReelRotationValue(false)).toBe(0);
    expect(getReelRotationValue(true)).toBe(1);
  });
});
