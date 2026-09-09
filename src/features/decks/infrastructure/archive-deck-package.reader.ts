import { strFromU8, unzipSync } from "fflate";

import {
  DeckPackageCardSchema,
  DeckPackageManifestSchema,
  isSafeDeckPackagePath,
} from "@/features/decks/contracts/deck-package.schema";
import type { DeckPackage, DeckPackageReader } from "@/features/decks/domain/deck-package.model";

export class DeckPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckPackageValidationError";
  }
}

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
      if (path !== "manifest.json" && path !== "cards.json" && !path.startsWith("audio/")) {
        throw new DeckPackageValidationError(`Unexpected archive path: ${path}`);
      }
      if (path.startsWith("audio/") && path.length === "audio/".length) {
        throw new DeckPackageValidationError("Audio archive path must name a file");
      }
      if (content.length === 0 && (path === "manifest.json" || path === "cards.json")) {
        throw new DeckPackageValidationError(`Empty ${path}`);
      }
    }

    const manifest = DeckPackageManifestSchema.parse(
      this.parseJson(files["manifest.json"], "manifest.json")
    );
    const rawCards = this.parseJson(files["cards.json"], "cards.json");
    if (!Array.isArray(rawCards)) {
      throw new DeckPackageValidationError("cards.json must contain an array");
    }
    const cards = rawCards.map((card, index) => {
      try {
        const parsed = DeckPackageCardSchema.parse(card);
        if (parsed.deckId !== manifest.id) {
          throw new DeckPackageValidationError(
            `Card ${parsed.id} references deck ${parsed.deckId} instead of ${manifest.id}`
          );
        }
        return parsed;
      } catch (error) {
        if (error instanceof DeckPackageValidationError) {
          throw error;
        }
        throw new DeckPackageValidationError(
          `Invalid flashcard at cards.json[${index}]: ${error instanceof Error ? error.message : "invalid card"}`
        );
      }
    });

    const ids = new Set<string>();
    const positions = new Set<number>();
    for (const card of cards) {
      if (ids.has(card.id)) {
        throw new DeckPackageValidationError(`Duplicate flashcard ID: ${card.id}`);
      }
      if (positions.has(card.position)) {
        throw new DeckPackageValidationError(`Duplicate flashcard position: ${card.position}`);
      }
      ids.add(card.id);
      positions.add(card.position);
      for (const reference of [card.questionAudio, card.answerAudio]) {
        if (reference === undefined) {
          continue;
        }
        if (!isSafeDeckPackagePath(reference) || !reference.startsWith("audio/")) {
          throw new DeckPackageValidationError(`Unsafe audio reference: ${reference}`);
        }
        if (!files[reference]) {
          throw new DeckPackageValidationError(`Missing referenced audio file: ${reference}`);
        }
      }
    }

    const audioFiles = new Map<string, Uint8Array>();
    for (const [path, content] of entries) {
      if (path.startsWith("audio/")) {
        audioFiles.set(path, content);
      }
    }
    return { audioFiles, cards, manifest };
  }

  private parseJson(bytes: Uint8Array | undefined, name: string): unknown {
    if (!bytes) {
      throw new DeckPackageValidationError(`Missing ${name}`);
    }
    try {
      return JSON.parse(strFromU8(bytes)) as unknown;
    } catch (error) {
      throw new DeckPackageValidationError(
        `Malformed ${name}: ${error instanceof Error ? error.message : "invalid JSON"}`
      );
    }
  }
}
