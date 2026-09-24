import { describe, expect, it } from "vitest";

import {
  splitFlashcardText,
  toSpokenFlashcardText,
} from "@/features/flashcards/domain/flashcard-text";

describe("flashcard text", () => {
  it("marks backtick spans as code and keeps the surrounding text", () => {
    expect(splitFlashcardText("What is the difference between `null` and `undefined`?")).toEqual([
      { code: false, text: "What is the difference between " },
      { code: true, text: "null" },
      { code: false, text: " and " },
      { code: true, text: "undefined" },
      { code: false, text: "?" },
    ]);
  });

  it("keeps an unmatched backtick as ordinary text", () => {
    expect(splitFlashcardText("Use ` carefully")).toEqual([
      { code: false, text: "Use ` carefully" },
    ]);
  });

  it("announces card text without code delimiters", () => {
    expect(toSpokenFlashcardText("What does `typeof` report for `null`?")).toBe(
      "What does typeof report for null?"
    );
  });
});
