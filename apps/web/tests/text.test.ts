import { describe, expect, it } from "vitest";

import { splitFlashcardText } from "@/lib/flashcard-text";

describe("flashcard text", () => {
  it("marks backtick spans as code and keeps the surrounding text", () => {
    expect(
      splitFlashcardText("Compare `null` and `undefined`.").map(({ code, text }) => ({
        code,
        text,
      }))
    ).toEqual([
      { code: false, text: "Compare " },
      { code: true, text: "null" },
      { code: false, text: " and " },
      { code: true, text: "undefined" },
      { code: false, text: "." },
    ]);
  });

  it("keeps an unmatched backtick as ordinary text", () => {
    expect(splitFlashcardText("Use ` carefully")).toEqual([
      { code: false, offset: 0, text: "Use ` carefully" },
    ]);
  });
});
