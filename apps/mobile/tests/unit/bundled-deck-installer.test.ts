import { describe, expect, it } from "vitest";

import {
  shouldApplyBundledAppearance,
  shouldInstallBundledDeck,
} from "@/infrastructure/bundled-deck-version";

describe("bundled deck startup version behavior", () => {
  it.each([
    [null, 2, true],
    [1, 2, true],
    [2, 2, false],
    [3, 2, false],
  ])(
    "installed version %s against bundled version %s reads package: %s",
    (installedVersion, bundledVersion, expected) => {
      expect(shouldInstallBundledDeck(installedVersion, bundledVersion)).toBe(expected);
    }
  );

  it("applies bundled appearance only to a fresh installation", () => {
    expect(shouldApplyBundledAppearance("installed")).toBe(true);
    expect(shouldApplyBundledAppearance("updated")).toBe(false);
    expect(shouldApplyBundledAppearance("no-op")).toBe(false);
  });
});
