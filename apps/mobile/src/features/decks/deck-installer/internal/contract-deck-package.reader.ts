import { parseDeckPackage } from "@flashcard-reels/deck-contract";

import type { DeckPackageReader } from "./deck-package.model";

/** Mobile adapter for the shared package parser. */
export class ContractDeckPackageReader implements DeckPackageReader {
  read(bytes: Uint8Array) {
    return parseDeckPackage(bytes);
  }
}
