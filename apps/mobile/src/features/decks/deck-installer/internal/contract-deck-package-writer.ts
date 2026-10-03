import { parseDeck, parseDeckPackage, type Deck } from "@flashcard-reels/deck-contract";
import { strToU8, zipSync } from "fflate";

// ZIP timestamps have no timezone. Use a fixed local wall clock for reproducible bytes.
const stableZipModificationTime = new Date(1980, 0, 1, 0, 0, 0);

/** Authoring helper. The shared parser remains the authority for archive validation. */
export function createContractDeckPackageArchive(
  document: Deck,
  audioFiles: Readonly<Record<string, Uint8Array>> = {},
  lessonFiles: Readonly<Record<string, string>> = {}
): Uint8Array {
  const deck = parseDeck(document);
  const files: Record<string, Uint8Array> = {
    "deck.json": strToU8(JSON.stringify(deck, null, 2)),
  };
  for (const [cardId, bytes] of Object.entries(audioFiles)) {
    files[`audio/${cardId}.mp3`] = bytes;
  }
  for (const [lessonId, markdown] of Object.entries(lessonFiles)) {
    files[`lessons/${lessonId}.md`] = strToU8(markdown);
  }
  const archive = zipSync(files, { level: 6, mtime: stableZipModificationTime });
  parseDeckPackage(archive);
  return archive;
}
