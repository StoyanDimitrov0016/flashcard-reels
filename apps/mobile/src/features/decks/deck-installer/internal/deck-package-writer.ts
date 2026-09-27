import { strToU8, zipSync } from "fflate";

import { DeckPackageSchema, type DeckPackageDocument } from "./deck-package.schema.ts";

// ZIP timestamps have no timezone. fflate reads local Date fields, so construct a fixed local
// wall-clock value to keep archive bytes identical on developer machines and CI runners.
const stableZipModificationTime = new Date(1980, 0, 1, 0, 0, 0);

export function createDeckPackageArchive(
  document: DeckPackageDocument,
  audioFiles: Readonly<Record<string, Uint8Array>> = {},
  lessonFiles: Readonly<Record<string, string>> = {}
): Uint8Array {
  const deck = DeckPackageSchema.parse(document);
  const linkedCards = deck.cards.filter((card) => card.lessonId);
  const packageDocument = {
    ...deck,
    cards: deck.cards.map(({ lessonId: _lessonId, ...card }) => card),
  };
  const archive: Record<string, Uint8Array> = {
    "deck.json": strToU8(JSON.stringify(packageDocument, null, 2)),
  };
  if (linkedCards.length > 0) {
    archive["card-lessons.json"] = strToU8(
      JSON.stringify(Object.fromEntries(linkedCards.map((card) => [card.id, card.lessonId])))
    );
  }
  // oxlint-disable-next-line unicorn/no-array-sort -- Object.entries creates the array being sorted.
  const sortedAudioFiles = Object.entries(audioFiles).sort(([leftPath], [rightPath]) =>
    leftPath.localeCompare(rightPath)
  );
  for (const [path, content] of sortedAudioFiles) {
    archive[path] = content;
  }
  // oxlint-disable-next-line unicorn/no-array-sort -- Object.entries creates the array being sorted.
  const sortedLessonFiles = Object.entries(lessonFiles).sort(([leftId], [rightId]) =>
    leftId.localeCompare(rightId)
  );
  for (const [lessonId, markdown] of sortedLessonFiles) {
    archive[`lessons/${lessonId}.md`] = strToU8(markdown);
  }
  return zipSync(archive, { level: 6, mtime: stableZipModificationTime });
}
