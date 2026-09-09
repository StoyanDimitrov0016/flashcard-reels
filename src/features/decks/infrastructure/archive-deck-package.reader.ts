import { strFromU8, unzipSync } from "fflate";

import {
  DeckPackageSchema,
  isSafeDeckPackagePath,
} from "@/features/decks/contracts/deck-package.schema";
import type { DeckPackage, DeckPackageReader } from "@/features/decks/domain/deck-package.model";

export class DeckPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckPackageValidationError";
  }
}

const audioPathPattern = /^audio\/([^/]+)\.(answer|question)\.mp3$/;

export class ArchiveDeckPackageReader implements DeckPackageReader {
  read(bytes: Uint8Array): DeckPackage {
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(bytes);
    } catch (error) {
      throw new DeckPackageValidationError(
        `Could not read .fcrdeck archive: ${error instanceof Error ? error.message : "invalid ZIP"}`
      );
    }

    const entries = Object.entries(files);
    for (const [path, content] of entries) {
      if (!isSafeDeckPackagePath(path) || path.endsWith("/")) {
        throw new DeckPackageValidationError(`Unsafe archive path: ${path}`);
      }
      if (path !== "deck.json" && !path.startsWith("audio/")) {
        throw new DeckPackageValidationError(`Unexpected archive path: ${path}`);
      }
      if (path === "deck.json" && content.length === 0) {
        throw new DeckPackageValidationError("Empty deck.json");
      }
      if (path.startsWith("audio/") && !audioPathPattern.test(path)) {
        throw new DeckPackageValidationError(`Unexpected audio filename: ${path}`);
      }
    }

    const parsedDeck = DeckPackageSchema.safeParse(this.parseJson(files["deck.json"]));
    if (!parsedDeck.success) {
      throw new DeckPackageValidationError(`Invalid deck.json: ${parsedDeck.error.message}`);
    }
    const deck = parsedDeck.data;
    const audioFiles = new Map<string, Uint8Array>();
    for (const [path, content] of entries) {
      if (!path.startsWith("audio/")) {
        continue;
      }
      const match = audioPathPattern.exec(path);
      if (!match || !deck.cards.some((card) => card.id === match[1])) {
        throw new DeckPackageValidationError(`Audio references an unknown card: ${path}`);
      }
      audioFiles.set(path, content);
    }
    return { ...deck, audioFiles };
  }

  private parseJson(bytes: Uint8Array | undefined): unknown {
    if (!bytes) {
      throw new DeckPackageValidationError("Missing deck.json");
    }
    try {
      return JSON.parse(strFromU8(bytes)) as unknown;
    } catch (error) {
      throw new DeckPackageValidationError(
        `Malformed deck.json: ${error instanceof Error ? error.message : "invalid JSON"}`
      );
    }
  }
}
