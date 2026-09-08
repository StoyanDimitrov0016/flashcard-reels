import { describe, expect, it, vi } from "vitest";

import {
  contrastRatio,
  deckAppearancePresets,
  isCurrentPreset,
} from "@/features/decks/presentation/deck-appearance-presets";
import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import { openFocusedFeed } from "@/features/reels/presentation/open-focused-feed";

describe("product polish policies", () => {
  it("hands the exact deck to Focus in Shuffle mode and navigates to Focus", () => {
    const startFocusedFeed = vi.fn();
    const navigate = vi.fn();
    const confirm = vi.fn();

    openFocusedFeed("deck-2", startFocusedFeed, navigate, confirm);

    expect(startFocusedFeed).toHaveBeenCalledWith("deck-2", "shuffle");
    expect(navigate).toHaveBeenCalledWith("/(tabs)/focus");
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("matches deck titles and descriptions case-insensitively and clears cleanly", () => {
    const deck = { description: "Closures and execution", title: "JavaScript" };

    expect(matchesDeckSearch(deck, "script")).toBe(true);
    expect(matchesDeckSearch(deck, "CLOSURES")).toBe(true);
    expect(matchesDeckSearch(deck, "database")).toBe(false);
    expect(matchesDeckSearch(deck, "")).toBe(true);
  });

  it("provides distinct named presets with accessible white primary text contrast", () => {
    expect(deckAppearancePresets).toHaveLength(9);
    expect(new Set(deckAppearancePresets.map(({ name }) => name)).size).toBe(9);
    for (const preset of deckAppearancePresets) {
      expect(contrastRatio(preset.backgroundColor, "#FFFFFF")).toBeGreaterThanOrEqual(7);
      expect(isCurrentPreset(preset, preset)).toBe(true);
    }
  });
});
