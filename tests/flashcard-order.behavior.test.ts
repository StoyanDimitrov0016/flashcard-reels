import { describe, expect, it } from "vitest";

import { flashcardSeedData } from "@/features/flashcards/infrastructure/seed-data/flashcards";

describe("flashcard deck ordering", () => {
  it("assigns contiguous positions to seeded cards in each deck", () => {
    const positionsByDeck = new Map<string, number[]>();

    for (const flashcard of flashcardSeedData) {
      const positions = positionsByDeck.get(flashcard.deckId) ?? [];
      positions.push(flashcard.position);
      positionsByDeck.set(flashcard.deckId, positions);
    }

    for (const positions of positionsByDeck.values()) {
      expect(positions).toEqual(
        Array.from({ length: positions.length }, (_, position) => position)
      );
    }
  });
});
