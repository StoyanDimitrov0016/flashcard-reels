import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  deckThemes,
  isCurrentPreset,
  resolveDeckTheme,
} from "@/features/decks/presentation/deck-theme-presets";

describe("deck themes", () => {
  it("provides unique paired presets with readable text and accents", () => {
    expect(new Set(deckThemes.map(({ id }) => id)).size).toBe(deckThemes.length);
    for (const preset of deckThemes) {
      expect(isCurrentPreset(preset, { theme: preset.id })).toBe(true);
      for (const variant of [preset.light, preset.dark]) {
        expect(contrastRatio(variant.textPrimary, variant.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(variant.accent, variant.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(variant.textSecondary, variant.background)).toBeGreaterThanOrEqual(
          4.5
        );
      }
    }
  });

  it("resolves the saved preset into the active color scheme", () => {
    for (const preset of deckThemes) {
      expect(resolveDeckTheme(preset.id, "light")).toEqual(preset.light);
      expect(resolveDeckTheme(preset.id, "dark")).toEqual(preset.dark);
    }
  });
});
