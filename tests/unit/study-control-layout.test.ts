import { describe, expect, it } from "vitest";

import {
  deriveAudioPosition,
  deriveIslandOrientation,
  deriveRatingOrder,
  getAudioSideLabel,
  getRatingDirectionLabel,
} from "@/features/reels/presentation/study-control-layout";

describe("study control derivation", () => {
  it("derives vertical side islands and a horizontal bottom island", () => {
    expect(deriveIslandOrientation("left")).toBe("vertical");
    expect(deriveIslandOrientation("right")).toBe("vertical");
    expect(deriveIslandOrientation("bottom")).toBe("horizontal");
  });

  it("reverses visual rating order without changing meanings", () => {
    expect(deriveRatingOrder("forward")).toEqual(["again", "hard", "good", "easy"]);
    expect(deriveRatingOrder("reverse")).toEqual(["easy", "good", "hard", "again"]);
  });

  it("derives contextual audio placement", () => {
    expect(deriveAudioPosition("bottom", "primary")).toBe("left");
    expect(deriveAudioPosition("bottom", "opposite")).toBe("right");
    expect(deriveAudioPosition("left", "primary")).toBe("above");
    expect(deriveAudioPosition("right", "opposite")).toBe("below");
  });

  it("labels direction and audio position contextually", () => {
    expect(getRatingDirectionLabel("bottom", "reverse")).toBe("Right → Left");
    expect(getRatingDirectionLabel("right", "forward")).toBe("Top → Bottom");
    expect(getAudioSideLabel("bottom", "primary")).toBe("Left");
    expect(getAudioSideLabel("left", "opposite")).toBe("Bottom");
  });
});
