/**
 * Flashcard text is plain text in which backtick-delimited spans mark code, such as `null`.
 * An unmatched backtick is ordinary text. The mobile app applies the same rule.
 * `offset` is the segment's position in the source text, which also makes a stable key.
 */
export type FlashcardTextSegment = Readonly<{ text: string; code: boolean; offset: number }>;

export function splitFlashcardText(text: string): FlashcardTextSegment[] {
  const segments: FlashcardTextSegment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const opening = text.indexOf("`", cursor);
    const closing = opening < 0 ? -1 : text.indexOf("`", opening + 1);
    if (opening < 0 || closing < 0) {
      segments.push({ code: false, offset: cursor, text: text.slice(cursor) });
      break;
    }
    if (opening > cursor) {
      segments.push({ code: false, offset: cursor, text: text.slice(cursor, opening) });
    }
    if (closing > opening + 1) {
      segments.push({ code: true, offset: opening, text: text.slice(opening + 1, closing) });
    }
    cursor = closing + 1;
  }
  return segments;
}
