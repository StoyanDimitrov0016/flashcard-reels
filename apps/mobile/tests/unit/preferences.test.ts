import { describe, expect, it } from "vitest";

import { normalizePersistedPreferences } from "@/features/preferences/application/normalize-preferences";
import {
  defaultAppPreferences,
  resolveColorScheme,
} from "@/features/preferences/domain/app-preferences";

describe("application preferences", () => {
  it("provides the complete default model", () => {
    expect(defaultAppPreferences).toEqual({
      colorMode: "device",
      studyIslandPosition: "right",
      ratingDirection: "forward",
      audioSide: "primary",
      audioEnabled: true,
      hapticsEnabled: true,
      readingEnabled: true,
      readingSide: "opposite",
    });
  });

  it("merges valid partial stored data with defaults", () => {
    expect(normalizePersistedPreferences({ colorMode: "light", audioEnabled: false })).toEqual({
      ...defaultAppPreferences,
      colorMode: "light",
      audioEnabled: false,
    });
  });

  it("preserves valid fields when another stored field is invalid", () => {
    expect(
      normalizePersistedPreferences({
        colorMode: "light",
        audioEnabled: "yes",
        hapticsEnabled: false,
      })
    ).toEqual({
      ...defaultAppPreferences,
      colorMode: "light",
      hapticsEnabled: false,
    });
  });
  it("keeps preferences saved before reading controls existed", () => {
    expect(
      normalizePersistedPreferences({ audioEnabled: false, studyIslandPosition: "bottom" })
    ).toEqual({
      ...defaultAppPreferences,
      audioEnabled: false,
      studyIslandPosition: "bottom",
    });
    expect(normalizePersistedPreferences({ readingEnabled: false, readingSide: "left" })).toEqual({
      ...defaultAppPreferences,
      readingEnabled: false,
    });
  });

  it("falls back to a complete model for invalid stored data", () => {
    expect(normalizePersistedPreferences({ colorMode: "sepia" })).toEqual(defaultAppPreferences);
    expect(normalizePersistedPreferences("not-json-object")).toEqual(defaultAppPreferences);
  });

  it("resolves explicit themes and device themes", () => {
    expect(resolveColorScheme("light", "dark")).toBe("light");
    expect(resolveColorScheme("dark", "light")).toBe("dark");
    expect(resolveColorScheme("device", "light")).toBe("light");
    expect(resolveColorScheme("device", "dark")).toBe("dark");
    expect(resolveColorScheme("device", null)).toBe("dark");
  });
});
