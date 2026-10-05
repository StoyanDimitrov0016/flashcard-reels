import type { DeckPackage } from "../deck.types.ts";

import { extractDeckArchive } from "./extract-deck-archive.ts";
import { parseDeckFiles } from "./parse-deck-files.ts";

/** Reads and validates a supported deck package, including every referenced asset. */
export function parseDeckPackage(bytes: Uint8Array): DeckPackage {
  return parseDeckFiles(extractDeckArchive(bytes));
}
