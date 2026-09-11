import { describe, expect, it } from "vitest";

import { darkColors, getAppColors, lightColors } from "@/shared/presentation/theme-colors";

describe("semantic application themes", () => {
  it("keeps the specified light and dark semantic palettes", () => {
    expect(lightColors.background).toBe("#FFFFFF");
    expect(lightColors.textPrimary).toBe("#222222");
    expect(darkColors.background).toBe("#1C1C1C");
    expect(darkColors.textPrimary).toBe("#F2F2F2");
  });

  it("resolves app colors from the same scheme", () => {
    expect(getAppColors("light")).toBe(lightColors);
    expect(getAppColors("dark")).toBe(darkColors);
  });
});
