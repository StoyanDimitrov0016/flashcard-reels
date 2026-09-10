import { strFromU8, unzipSync } from "fflate";

import {
  DeckPackageSchema,
  isSafeDeckPackagePath,
} from "@/features/decks/contracts/deck-package.schema";
import type { DeckPackage, DeckPackageReader } from "@/features/decks/domain/deck-package.model";
import {
  DeckPackageValidationError,
  validateAudioResources,
  validateCardCount,
  validateCompressedPackageSize,
  validateUncompressedPackageSize,
} from "@/features/decks/domain/deck-package-limits";

const audioPathPattern = /^audio\/([^/]+)\.(answer|question)\.mp3$/;
const endOfCentralDirectorySignature = 0x06054b50;
const centralDirectoryEntrySignature = 0x02014b50;

function validateZipResourceMetadata(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const earliestEndRecord = Math.max(0, bytes.byteLength - 22 - 65_535);
  let endRecordOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= earliestEndRecord; offset -= 1) {
    if (view.getUint32(offset, true) === endOfCentralDirectorySignature) {
      endRecordOffset = offset;
      break;
    }
  }
  if (endRecordOffset < 0) {
    return;
  }

  const entryCount = view.getUint16(endRecordOffset + 10, true);
  let entryOffset = view.getUint32(endRecordOffset + 16, true);
  let uncompressedSize = 0;
  const audioSizes: number[] = [];
  const decoder = new TextDecoder();
  for (let index = 0; index < entryCount; index += 1) {
    if (
      entryOffset + 46 > bytes.byteLength ||
      view.getUint32(entryOffset, true) !== centralDirectoryEntrySignature
    ) {
      return;
    }
    const entrySize = view.getUint32(entryOffset + 24, true);
    const nameLength = view.getUint16(entryOffset + 28, true);
    const extraLength = view.getUint16(entryOffset + 30, true);
    const commentLength = view.getUint16(entryOffset + 32, true);
    const nameStart = entryOffset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.byteLength) {
      return;
    }
    const name = decoder.decode(bytes.subarray(nameStart, nameEnd));
    uncompressedSize += entrySize;
    if (name.startsWith("audio/")) {
      audioSizes.push(entrySize);
    }
    entryOffset = nameEnd + extraLength + commentLength;
  }
  validateUncompressedPackageSize(uncompressedSize);
  validateAudioResources(audioSizes.length, audioSizes);
}

export class ArchiveDeckPackageReader implements DeckPackageReader {
  read(bytes: Uint8Array): DeckPackage {
    validateCompressedPackageSize(bytes.byteLength);
    validateZipResourceMetadata(bytes);
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(bytes);
    } catch (error) {
      throw new DeckPackageValidationError(
        `Could not read .fcrdeck archive: ${error instanceof Error ? error.message : "invalid ZIP"}`
      );
    }

    const entries = Object.entries(files);
    validateUncompressedPackageSize(
      entries.reduce((total, [, content]) => total + content.byteLength, 0)
    );
    const audioEntries = entries.filter(([path]) => path.startsWith("audio/"));
    validateAudioResources(
      audioEntries.length,
      audioEntries.map(([, content]) => content.byteLength)
    );
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
    validateCardCount(deck.cards.length);
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
