import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";

type SourceFlashcard = Readonly<{ order: number }>;

const parsedFlashcardSourceData: unknown = JSON.parse(
  readFileSync(
    fileURLToPath(new NodeURL("../../data/demo-deck/deck.json", import.meta.url)),
    "utf8"
  )
);

function isSourceFlashcard(value: unknown): value is SourceFlashcard {
  return (
    typeof value === "object" &&
    value !== null &&
    "order" in value &&
    typeof value.order === "number"
  );
}

if (
  typeof parsedFlashcardSourceData !== "object" ||
  parsedFlashcardSourceData === null ||
  !("cards" in parsedFlashcardSourceData) ||
  !Array.isArray(parsedFlashcardSourceData.cards) ||
  !parsedFlashcardSourceData.cards.every(isSourceFlashcard)
) {
  throw new Error("Invalid demo flashcard source");
}

const flashcardSourceData = parsedFlashcardSourceData.cards;

describe("flashcard deck ordering", () => {
  it("assigns contiguous orders to demo source cards", () => {
    expect(flashcardSourceData.map((card) => card.order)).toEqual(
      Array.from({ length: flashcardSourceData.length }, (_, position) => position)
    );
  });
});
