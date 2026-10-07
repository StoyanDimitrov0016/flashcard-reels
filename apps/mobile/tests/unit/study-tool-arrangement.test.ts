import { describe, expect, it } from "vitest";

import { arrangeStudyTools } from "@/features/reels/presentation/study-control-layout";

describe("study tool arrangement", () => {
  it("keeps audio next to the ratings when reading shares its side", () => {
    expect(arrangeStudyTools({ audio: "left", reading: "left" })).toEqual({
      before: ["reading", "audio"],
      after: [],
    });
    expect(arrangeStudyTools({ audio: "below", reading: "below" })).toEqual({
      before: [],
      after: ["audio", "reading"],
    });
  });

  it("places tools on opposite sides and hides tools without a placement", () => {
    expect(arrangeStudyTools({ audio: "above", reading: "below" })).toEqual({
      before: ["audio"],
      after: ["reading"],
    });
    expect(arrangeStudyTools({ audio: null, reading: "right" })).toEqual({
      before: [],
      after: ["reading"],
    });
    expect(arrangeStudyTools({ audio: null, reading: null })).toEqual({ before: [], after: [] });
  });
});
