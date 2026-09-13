import { strToU8, zipSync } from "fflate";

import { DeckPackageSchema, type DeckPackageDocument } from "./deck-package.schema.ts";

const stableZipModificationTime = new Date("1980-01-01T00:00:00.000Z");

export function createDeckPackageArchive(
  document: DeckPackageDocument,
  audioFiles: Readonly<Record<string, Uint8Array>> = {}
): Uint8Array {
  const deck = DeckPackageSchema.parse(document);
  const archive: Record<string, Uint8Array> = {
    "deck.json": strToU8(JSON.stringify(deck, null, 2)),
  };
  const sortedAudioFiles = Object.entries(audioFiles).reduce<[string, Uint8Array][]>(
    (entries, entry) => {
      const insertionIndex = entries.findIndex(([path]) => path.localeCompare(entry[0]) > 0);
      return insertionIndex < 0
        ? [...entries, entry]
        : [...entries.slice(0, insertionIndex), entry, ...entries.slice(insertionIndex)];
    },
    []
  );
  for (const [path, content] of sortedAudioFiles) {
    archive[path] = content;
  }
  return zipSync(archive, { level: 6, mtime: stableZipModificationTime });
}
