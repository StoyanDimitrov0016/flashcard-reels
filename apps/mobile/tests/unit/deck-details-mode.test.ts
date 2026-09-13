import { describe, expect, it } from "vitest";

import {
  getDeckDetailsHref,
  resolveDeckDetailsMode,
  showsLearningProgress,
} from "@/features/decks/presentation/deck-details-mode";

describe("deck details mode", () => {
  it("keeps Library and Progress navigation and presentation distinct", () => {
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
});
