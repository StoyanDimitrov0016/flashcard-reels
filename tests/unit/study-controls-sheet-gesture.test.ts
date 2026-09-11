import { describe, expect, it } from "vitest";

import { shouldDismissStudyControlsSheet } from "@/features/preferences/presentation/study-controls-sheet-gesture";

describe("study controls sheet dismissal", () => {
  it("dismisses after a deliberate downward drag", () => {
    expect(shouldDismissStudyControlsSheet(96, 0)).toBe(true);
  });

  it("dismisses a quick downward flick", () => {
    expect(shouldDismissStudyControlsSheet(24, 0.6)).toBe(true);
  });

  it("returns the sheet after a short gesture", () => {
    expect(shouldDismissStudyControlsSheet(95, 0)).toBe(false);
    expect(shouldDismissStudyControlsSheet(23, 1)).toBe(false);
    expect(shouldDismissStudyControlsSheet(-24, 1)).toBe(false);
  });
});
