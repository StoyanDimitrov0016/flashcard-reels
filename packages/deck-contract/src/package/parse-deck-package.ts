import type { Deck } from "../deck.schemas.ts";

import { extractDeckArchive } from "./extract-deck-archive.ts";
import { readDeckAssets, type DeckAssets } from "./read-deck-assets.ts";
import { readDeckManifest } from "./read-deck-manifest.ts";

export type DeckPackage = Readonly<{ deck: Deck }> & DeckAssets;

/** Reads and validates a supported deck package, including every referenced asset. */
export function parseDeckPackage(bytes: Uint8Array): DeckPackage {
  const files = extractDeckArchive(bytes);
  const deck = readDeckManifest(files);
  const assets = readDeckAssets(deck, files);

  return { deck, ...assets };
}
