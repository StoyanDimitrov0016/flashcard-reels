import type { Deck } from "../deck.schemas";

import { extractDeckArchive } from "./extract-deck-archive";
import { readDeckAssets, type DeckAssets } from "./read-deck-assets";
import { readDeckManifest } from "./read-deck-manifest";

export type DeckPackage = Readonly<{ deck: Deck }> & DeckAssets;

/** Reads and validates a contract-1 package, including every referenced asset. */
export function parseDeckPackage(bytes: Uint8Array): DeckPackage {
  const files = extractDeckArchive(bytes);
  const deck = readDeckManifest(files);
  const assets = readDeckAssets(deck, files);

  return { deck, ...assets };
}
