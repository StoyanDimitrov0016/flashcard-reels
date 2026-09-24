/**
 * Flashcard text is plain text in which backtick-delimited spans mark code, such as `null`.
 * An unmatched backtick is ordinary text.
 */
export type FlashcardTextSegment = Readonly<{ text: string; code: boolean }>;

export function splitFlashcardText(text: string): FlashcardTextSegment[] {
  const segments: FlashcardTextSegment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const opening = text.indexOf("`", cursor);
    const closing = opening < 0 ? -1 : text.indexOf("`", opening + 1);
    if (opening < 0 || closing < 0) {
      segments.push({ code: false, text: text.slice(cursor) });
      break;
    }
    if (opening > cursor) {
      segments.push({ code: false, text: text.slice(cursor, opening) });
    }
    if (closing > opening + 1) {
      segments.push({ code: true, text: text.slice(opening + 1, closing) });
    }
    cursor = closing + 1;
  }
  return segments;
}

/** The text a screen reader should announce, without code delimiters. */
export function toSpokenFlashcardText(text: string): string {
  return splitFlashcardText(text)
    .map((segment) => segment.text)
    .join("");
}
