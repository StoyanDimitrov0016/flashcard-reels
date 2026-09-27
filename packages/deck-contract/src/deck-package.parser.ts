import { strFromU8 } from "fflate";

import type { Deck } from "./deck.schemas";

import { extractDeckArchive } from "./deck-package.archive";
import { readDeckAssets, type DeckAssets } from "./deck-package.assets";
import { DeckPackageParseError, DeckParseError, rejectDeckPackage } from "./deck.errors";
import { parseDeck } from "./deck.validator";

export type DeckPackage = Readonly<{ deck: Deck }> & DeckAssets;

function readManifest(files: Record<string, Uint8Array>): Deck {
  const bytes = files["deck.json"];
  if (!bytes?.byteLength) {
    rejectDeckPackage("Missing or empty deck.json", ["deck.json"]);
  }

  let document: unknown;
  try {
    document = JSON.parse(strFromU8(bytes)) as unknown;
  } catch (cause) {
    throw new DeckPackageParseError([{ path: ["deck.json"], message: "Malformed JSON" }], {
      cause,
    });
  }

  try {
    return parseDeck(document);
  } catch (cause) {
    if (cause instanceof DeckParseError) {
      throw new DeckPackageParseError(cause.issues, { cause });
    }
    throw cause;
  }
}

/** Reads and validates a contract-1 package, including every referenced asset. */
export function parseDeckPackage(bytes: Uint8Array): DeckPackage {
  const files = extractDeckArchive(bytes);
  const deck = readManifest(files);
  const assets = readDeckAssets(deck, files);

  return { deck, ...assets };
}
