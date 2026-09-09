import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";

type SourceFlashcard = Readonly<{ deckId: string; order: number }>;

const parsedFlashcardSourceData: unknown = JSON.parse(
  readFileSync(
    fileURLToPath(
      new NodeURL("../data/technical_flashcard_library/flashcards.json", import.meta.url)
    ),
    "utf8"
  )
);

function isSourceFlashcard(value: unknown): value is SourceFlashcard {
  return (
    typeof value === "object" &&
    value !== null &&
    "deckId" in value &&
    typeof value.deckId === "string" &&
    "order" in value &&
    typeof value.order === "number"
  );
}

if (
  !Array.isArray(parsedFlashcardSourceData) ||
  !parsedFlashcardSourceData.every(isSourceFlashcard)
) {
  throw new Error("Invalid technical flashcard source");
}

const flashcardSourceData = parsedFlashcardSourceData;

describe("flashcard deck ordering", () => {
  it("assigns contiguous orders to seeded cards in each deck", () => {
    const positionsByDeck = new Map<string, number[]>();

    for (const flashcard of flashcardSourceData) {
      const positions = positionsByDeck.get(flashcard.deckId) ?? [];
      positions.push(flashcard.order);
      positionsByDeck.set(flashcard.deckId, positions);
    }

    for (const positions of positionsByDeck.values()) {
      expect(positions).toEqual(
        Array.from({ length: positions.length }, (_, position) => position)
      );
    }
  });
});
