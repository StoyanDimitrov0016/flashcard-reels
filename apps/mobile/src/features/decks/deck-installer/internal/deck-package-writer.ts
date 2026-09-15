import { strToU8, zipSync } from "fflate";

import { DeckPackageSchema, type DeckPackageDocument } from "./deck-package.schema.ts";

// ZIP timestamps have no timezone. fflate reads local Date fields, so construct a fixed local
// wall-clock value to keep archive bytes identical on developer machines and CI runners.
const stableZipModificationTime = new Date(1980, 0, 1, 0, 0, 0);

export function createDeckPackageArchive(
  document: DeckPackageDocument,
  audioFiles: Readonly<Record<string, Uint8Array>> = {}
): Uint8Array {
  const deck = DeckPackageSchema.parse(document);
  const archive: Record<string, Uint8Array> = {
    "deck.json": strToU8(JSON.stringify(deck, null, 2)),
  };
  // oxlint-disable-next-line unicorn/no-array-sort -- Object.entries creates the array being sorted.
  const sortedAudioFiles = Object.entries(audioFiles).sort(([leftPath], [rightPath]) =>
    leftPath.localeCompare(rightPath)
  );
  for (const [path, content] of sortedAudioFiles) {
    archive[path] = content;
  }
  return zipSync(archive, { level: 6, mtime: stableZipModificationTime });
}
