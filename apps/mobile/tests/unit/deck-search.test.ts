import { describe, expect, it } from "vitest";

import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import { matchesFlashcardSearch } from "@/features/decks/presentation/flashcard-search";

describe("deck catalog search", () => {
  it("matches deck titles and descriptions case-insensitively", () => {
    const deck = { description: "Closures and execution", title: "JavaScript" };
    expect(matchesDeckSearch(deck, "script")).toBe(true);
    expect(matchesDeckSearch(deck, "CLOSURES")).toBe(true);
    expect(matchesDeckSearch(deck, "database")).toBe(false);
    expect(matchesDeckSearch(deck, "")).toBe(true);
  });

  it("matches flashcard questions and answers case-insensitively", () => {
    const card = { answer: "A retained lexical scope", question: "What is a closure?" };
    expect(matchesFlashcardSearch(card, "closure")).toBe(true);
    expect(matchesFlashcardSearch(card, "LEXICAL")).toBe(true);
    expect(matchesFlashcardSearch(card, "database")).toBe(false);
  });
});
