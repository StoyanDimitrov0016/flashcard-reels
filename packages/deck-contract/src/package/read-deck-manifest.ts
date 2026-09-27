import { strFromU8 } from "fflate";

import type { Deck } from "../deck.schemas";

import { DeckPackageParseError } from "../errors/deck-package-parse-error";
import { DeckParseError } from "../errors/deck-parse-error";
import { parseDeck } from "../validation/parse-deck";
import { rejectDeckPackage } from "./reject-deck-package";

export function readDeckManifest(files: Record<string, Uint8Array>): Deck {
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
