import { describe, expect, it } from "vitest";

import { shouldInstallBundledDeck } from "@/infrastructure/bundled-deck-version";

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
});
