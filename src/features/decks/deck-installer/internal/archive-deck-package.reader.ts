import { strFromU8, unzipSync } from "fflate";

import { DeckPackageSchema, isSafeDeckPackagePath } from "./deck-package.schema.ts";
import type { DeckPackage, DeckPackageReader } from "./deck-package.model.ts";
import {
  DeckPackageValidationError,
  validateAudioResources,
  validateCardCount,
  validateCompressedPackageSize,
  validateUncompressedPackageSize,
} from "./deck-package-limits.ts";

const audioPathPattern = /^audio\/([^/]+)\.(answer|question)\.mp3$/;
const endOfCentralDirectorySignature = 0x06054b50;
const centralDirectoryEntrySignature = 0x02014b50;
const localFileHeaderSignature = 0x04034b50;
const zip64EndLocatorSignature = 0x07064b50;

function invalidZipMetadata(message: string): never {
  throw new DeckPackageValidationError(`Invalid ZIP metadata: ${message}`);
}

function validateZipResourceMetadata(bytes: Uint8Array): void {
  if (bytes.byteLength < 22) {
    invalidZipMetadata("missing end-of-central-directory record");
  }
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
    invalidZipMetadata("missing end-of-central-directory record");
  }

  const commentLength = view.getUint16(endRecordOffset + 20, true);
  if (endRecordOffset + 22 + commentLength !== bytes.byteLength) {
    invalidZipMetadata("end-of-central-directory record is not at archive end");
  }
  if (
    endRecordOffset >= 20 &&
    view.getUint32(endRecordOffset - 20, true) === zip64EndLocatorSignature
  ) {
    invalidZipMetadata("ZIP64 archives are not supported");
  }
  const diskNumber = view.getUint16(endRecordOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(endRecordOffset + 6, true);
  const diskEntryCount = view.getUint16(endRecordOffset + 8, true);
  const entryCount = view.getUint16(endRecordOffset + 10, true);
  const centralDirectorySize = view.getUint32(endRecordOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(endRecordOffset + 16, true);
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || diskEntryCount !== entryCount) {
    invalidZipMetadata("multi-disk archives are not supported");
  }
  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    invalidZipMetadata("ZIP64 archives are not supported");
  }
  if (centralDirectoryOffset + centralDirectorySize !== endRecordOffset) {
    invalidZipMetadata("central-directory bounds are inconsistent");
  }

  let entryOffset = centralDirectoryOffset;
  let uncompressedSize = 0;
  const audioSizes: number[] = [];
  const decoder = new TextDecoder();
  for (let index = 0; index < entryCount; index += 1) {
    if (
      entryOffset + 46 > endRecordOffset ||
      view.getUint32(entryOffset, true) !== centralDirectoryEntrySignature
    ) {
      invalidZipMetadata("malformed central-directory entry");
    }
    const flags = view.getUint16(entryOffset + 8, true);
    const compressionMethod = view.getUint16(entryOffset + 10, true);
    const compressedSize = view.getUint32(entryOffset + 20, true);
    const entrySize = view.getUint32(entryOffset + 24, true);
    const nameLength = view.getUint16(entryOffset + 28, true);
    const extraLength = view.getUint16(entryOffset + 30, true);
    const entryCommentLength = view.getUint16(entryOffset + 32, true);
    const diskStart = view.getUint16(entryOffset + 34, true);
    const localHeaderOffset = view.getUint32(entryOffset + 42, true);
    if (
      compressedSize === 0xffffffff ||
      entrySize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      invalidZipMetadata("ZIP64 archives are not supported");
    }
    if (
      diskStart !== 0 ||
      (flags & 1) !== 0 ||
      (compressionMethod !== 0 && compressionMethod !== 8)
    ) {
      invalidZipMetadata("unsupported entry structure");
    }
    const nameStart = entryOffset + 46;
    const nameEnd = nameStart + nameLength;
    const nextEntryOffset = nameEnd + extraLength + entryCommentLength;
    if (nextEntryOffset > endRecordOffset) {
      invalidZipMetadata("central-directory variable fields exceed bounds");
    }
    if (
      localHeaderOffset + 30 > centralDirectoryOffset ||
      view.getUint32(localHeaderOffset, true) !== localFileHeaderSignature
    ) {
      invalidZipMetadata("local-file header is missing or out of bounds");
    }
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > centralDirectoryOffset) {
      invalidZipMetadata("compressed entry data exceeds archive bounds");
    }
    const name = decoder.decode(bytes.subarray(nameStart, nameEnd));
    uncompressedSize += entrySize;
    if (name.startsWith("audio/")) {
      audioSizes.push(entrySize);
    }
    entryOffset = nextEntryOffset;
  }
  if (entryOffset !== endRecordOffset) {
    invalidZipMetadata("central-directory size does not match its entries");
  }
  validateUncompressedPackageSize(uncompressedSize);
  validateAudioResources(audioSizes.length, audioSizes);
}

export class ArchiveDeckPackageReader implements DeckPackageReader {
  private readonly decompress: (bytes: Uint8Array) => Record<string, Uint8Array>;

  constructor(decompress: (bytes: Uint8Array) => Record<string, Uint8Array> = unzipSync) {
    this.decompress = decompress;
  }

  read(bytes: Uint8Array): DeckPackage {
    validateCompressedPackageSize(bytes.byteLength);
    validateZipResourceMetadata(bytes);
    let files: Record<string, Uint8Array>;
    try {
      files = this.decompress(bytes);
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
    const cardIds = new Set(deck.cards.map((card) => card.id));
    const audioFiles = new Map<string, Uint8Array>();
    for (const [path, content] of entries) {
      if (!path.startsWith("audio/")) {
        continue;
      }
      const match = audioPathPattern.exec(path);
      if (!match || !cardIds.has(match[1] ?? "")) {
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
