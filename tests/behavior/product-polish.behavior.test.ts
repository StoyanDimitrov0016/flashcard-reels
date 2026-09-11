import { describe, expect, it, vi } from "vitest";

import {
  contrastRatio,
  deckAppearancePresets,
  isCurrentPreset,
  resolveDeckAppearance,
} from "@/features/decks/presentation/deck-appearance-presets";
import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import {
  getDeckDetailsHref,
  resolveDeckDetailsMode,
  showsLearningProgress,
} from "@/features/decks/presentation/deck-details-mode";
import { matchesFlashcardSearch } from "@/features/decks/presentation/flashcard-search";
import { openFocusedFeed } from "@/features/reels/presentation/open-focused-feed";

describe("product polish policies", () => {
  it("hands the exact deck to Focus and navigates to Focus", () => {
    const startFocusedFeed = vi.fn();
    const navigate = vi.fn();

    openFocusedFeed("deck-2", startFocusedFeed, navigate);

    expect(startFocusedFeed).toHaveBeenCalledWith("deck-2");
    expect(navigate).toHaveBeenCalledWith("/(tabs)/focus");
  });

  it("matches deck titles and descriptions case-insensitively and clears cleanly", () => {
    const deck = { description: "Closures and execution", title: "JavaScript" };

    expect(matchesDeckSearch(deck, "script")).toBe(true);
    expect(matchesDeckSearch(deck, "CLOSURES")).toBe(true);
    expect(matchesDeckSearch(deck, "database")).toBe(false);
    expect(matchesDeckSearch(deck, "")).toBe(true);
  });

  it("matches deck flashcard questions and answers", () => {
    const card = { answer: "A retained lexical scope", question: "What is a closure?" };

    expect(matchesFlashcardSearch(card, "closure")).toBe(true);
    expect(matchesFlashcardSearch(card, "LEXICAL")).toBe(true);
    expect(matchesFlashcardSearch(card, "database")).toBe(false);
  });

  it("keeps Library and Progress deck details behavior distinct", () => {
    expect(getDeckDetailsHref("deck-1", "library")).toEqual({
      params: { deckId: "deck-1", mode: "library" },
      pathname: "/decks/[deckId]",
    });
    expect(getDeckDetailsHref("deck-1", "progress")).toEqual({
      params: { deckId: "deck-1", mode: "progress" },
      pathname: "/decks/[deckId]",
    });
    expect(showsLearningProgress(resolveDeckDetailsMode("progress"))).toBe(true);
    expect(showsLearningProgress(resolveDeckDetailsMode("library"))).toBe(false);
    expect(showsLearningProgress(resolveDeckDetailsMode(undefined))).toBe(false);
  });

  it("provides ten paired presets with readable text and accents", () => {
    expect(deckAppearancePresets).toHaveLength(10);
    expect(new Set(deckAppearancePresets.map(({ id }) => id)).size).toBe(10);
    for (const preset of deckAppearancePresets) {
      expect(isCurrentPreset(preset, { presetId: preset.id })).toBe(true);
      for (const variant of [preset.light, preset.dark]) {
        expect(contrastRatio(variant.textPrimary, variant.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(variant.accent, variant.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("resolves the saved preset into the active application scheme", () => {
    for (const preset of deckAppearancePresets) {
      expect(resolveDeckAppearance(preset.id, "light")).toEqual(preset.light);
      expect(resolveDeckAppearance(preset.id, "dark")).toEqual(preset.dark);
    }
  });
});
