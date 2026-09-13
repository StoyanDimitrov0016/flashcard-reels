import { describe, expect, it } from "vitest";

import {
  defaultAppPreferences,
  resolveColorScheme,
} from "@/features/preferences/domain/app-preferences";
import { normalizePersistedPreferences } from "@/features/preferences/application/normalize-preferences";

describe("application preferences", () => {
  it("provides the complete default model", () => {
    expect(defaultAppPreferences).toEqual({
      appearance: "device",
      recollectionIslandPosition: "right",
      ratingDirection: "forward",
      audioSide: "primary",
      audioEnabled: true,
      hapticsEnabled: true,
    });
  });

  it("merges valid partial stored data with defaults", () => {
    expect(normalizePersistedPreferences({ appearance: "light", audioEnabled: false })).toEqual({
      ...defaultAppPreferences,
      appearance: "light",
      audioEnabled: false,
    });
  });

  it("preserves valid fields when another stored field is invalid", () => {
    expect(
      normalizePersistedPreferences({
        appearance: "light",
        audioEnabled: "yes",
        hapticsEnabled: false,
      })
    ).toEqual({
      ...defaultAppPreferences,
      appearance: "light",
      hapticsEnabled: false,
    });
  });
  it("falls back to a complete model for invalid stored data", () => {
    expect(normalizePersistedPreferences({ appearance: "sepia" })).toEqual(defaultAppPreferences);
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
