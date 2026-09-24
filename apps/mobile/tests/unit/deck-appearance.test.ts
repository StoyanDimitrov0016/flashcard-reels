import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  deckAppearancePresets,
  isCurrentPreset,
  resolveDeckAppearance,
} from "@/features/decks/presentation/deck-appearance-presets";

describe("deck appearance presets", () => {
  it("provides unique paired presets with readable text and accents", () => {
    expect(new Set(deckAppearancePresets.map(({ id }) => id)).size).toBe(
      deckAppearancePresets.length
    );
    for (const preset of deckAppearancePresets) {
      expect(isCurrentPreset(preset, { presetId: preset.id })).toBe(true);
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
    for (const preset of deckAppearancePresets) {
      expect(resolveDeckAppearance(preset.id, "light")).toEqual(preset.light);
      expect(resolveDeckAppearance(preset.id, "dark")).toEqual(preset.dark);
    }
  });
});
