import {
  DECK_PACKAGE_LIMITS,
  DECK_SCHEMA_CONSTRAINTS,
  DeckPackageParseError,
} from "@flashcard-reels/deck-contract";
import { FlateErrorCode, inflateSync } from "fflate";

/**
 * Reads individual ZIP entries through byte-range requests. A deck package is mostly audio, so the
 * portal fetches only the end-of-archive directory and the entries it needs, never the whole file.
 * ZIP64 and multi-disk archives are rejected; deck packages never use them.
 */

type ZipEntry = Readonly<{
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}>;

export type ReadRange = (start: number, end: number) => Promise<Uint8Array>;

export type ZipRangeReader = Readonly<{
  entries: readonly ZipEntry[];
  read: (name: string) => Promise<Uint8Array | null>;
}>;

const EndOfCentralDirectorySignature = 0x06054b50;
const CentralDirectorySignature = 0x02014b50;
const LocalHeaderSignature = 0x04034b50;
const EndRecordSize = 22;
const MaximumCommentSize = 0xffff;
const LocalHeaderSize = 30;
const StoredMethod = 0;
const DeflatedMethod = 8;
const InvalidDeflateCodes: ReadonlySet<number> = new Set([
  FlateErrorCode.UnexpectedEOF,
  FlateErrorCode.InvalidBlockType,
  FlateErrorCode.InvalidLengthLiteral,
  FlateErrorCode.InvalidDistance,
]);
const MaximumEntries =
  1 +
  DECK_SCHEMA_CONSTRAINTS.maxFlashcards +
  DECK_SCHEMA_CONSTRAINTS.maxLessons * (1 + DECK_SCHEMA_CONSTRAINTS.maxSectionsPerLesson);

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function invalid(message: string): never {
  throw new DeckPackageParseError([{ path: [], message }]);
}

function findEndRecord(tail: Uint8Array): number {
  const data = view(tail);
  for (let offset = tail.byteLength - EndRecordSize; offset >= 0; offset -= 1) {
    if (
      data.getUint32(offset, true) === EndOfCentralDirectorySignature &&
      offset + EndRecordSize + data.getUint16(offset + 20, true) === tail.byteLength
    ) {
      return offset;
    }
  }
  return invalid("missing end-of-central-directory record");
}

function parseCentralDirectory(directory: Uint8Array, entryCount: number): ZipEntry[] {
  const data = view(directory);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  let expandedSize = 0;
  let offset = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > directory.byteLength ||
      data.getUint32(offset, true) !== CentralDirectorySignature
    ) {
      invalid("malformed central directory");
    }
    const nameLength = data.getUint16(offset + 28, true);
    const extraLength = data.getUint16(offset + 30, true);
    const commentLength = data.getUint16(offset + 32, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > directory.byteLength) {
      invalid("central directory entry exceeds its bounds");
    }
    const name = decoder.decode(directory.subarray(offset + 46, offset + 46 + nameLength));
    const compressedSize = data.getUint32(offset + 20, true);
    const uncompressedSize = data.getUint32(offset + 24, true);
    const localHeaderOffset = data.getUint32(offset + 42, true);
    const method = data.getUint16(offset + 10, true);
    const flags = data.getUint16(offset + 8, true);
    if (
      names.has(name) ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff ||
      (flags & 1) !== 0 ||
      (method !== StoredMethod && method !== DeflatedMethod)
    ) {
      invalid(`unsupported or duplicate entry: ${name}`);
    }
    names.add(name);
    expandedSize += uncompressedSize;
    if (
      expandedSize > DECK_PACKAGE_LIMITS.maxUncompressedBytes ||
      (name === "deck.json" && uncompressedSize > DECK_PACKAGE_LIMITS.maxManifestFileBytes) ||
      (name.startsWith("audio/") && uncompressedSize > DECK_PACKAGE_LIMITS.maxAudioFileBytes) ||
      (name.startsWith("lessons/") && uncompressedSize > DECK_PACKAGE_LIMITS.maxLessonTextFileBytes)
    ) {
      invalid(`entry exceeds size limit: ${name}`);
    }
    entries.push({ compressedSize, localHeaderOffset, method, name, uncompressedSize });
    offset = next;
  }
  if (offset !== directory.byteLength) {
    invalid("central directory size does not match its entries");
  }
  return entries;
}

export async function openZipRangeReader(
  size: number,
  readRange: ReadRange
): Promise<ZipRangeReader> {
  if (size < EndRecordSize || size > DECK_PACKAGE_LIMITS.maxCompressedBytes) {
    invalid("archive exceeds size limit or is incomplete");
  }
  async function readExact(start: number, end: number): Promise<Uint8Array> {
    if (start < 0 || end > size || end < start) {
      invalid("entry exceeds archive bounds");
    }
    const bytes = await readRange(start, end);
    if (bytes.byteLength !== end - start) {
      invalid("incomplete range response");
    }
    return bytes;
  }
  const tailStart = Math.max(0, size - EndRecordSize - MaximumCommentSize);
  const tail = await readExact(tailStart, size);
  const endRecord = findEndRecord(tail);
  const endData = view(tail);
  const entryCount = endData.getUint16(endRecord + 10, true);
  const directorySize = endData.getUint32(endRecord + 12, true);
  const directoryOffset = endData.getUint32(endRecord + 16, true);
  if (
    endData.getUint16(endRecord + 4, true) !== 0 ||
    endData.getUint16(endRecord + 6, true) !== 0 ||
    endData.getUint16(endRecord + 8, true) !== entryCount
  ) {
    invalid("multi-disk archives are not supported");
  }
  if (
    entryCount === 0xffff ||
    entryCount > MaximumEntries ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    invalid("ZIP64 archives are not supported");
  }
  if (directoryOffset + directorySize !== tailStart + endRecord) {
    invalid("central directory bounds are inconsistent");
  }

  const directory =
    directoryOffset >= tailStart
      ? tail.subarray(directoryOffset - tailStart, directoryOffset - tailStart + directorySize)
      : await readExact(directoryOffset, directoryOffset + directorySize);
  const entries = parseCentralDirectory(directory, entryCount);
  const entriesByName = new Map(entries.map((entry) => [entry.name, entry]));

  return {
    entries,
    async read(name: string): Promise<Uint8Array | null> {
      const entry = entriesByName.get(name);
      if (!entry) {
        return null;
      }
      // The local header's extra field can differ from the central directory's, so read it first.
      const header = await readExact(
        entry.localHeaderOffset,
        entry.localHeaderOffset + LocalHeaderSize
      );
      const headerData = view(header);
      if (
        header.byteLength < LocalHeaderSize ||
        headerData.getUint32(0, true) !== LocalHeaderSignature
      ) {
        invalid(`missing local header for ${name}`);
      }
      const dataStart =
        entry.localHeaderOffset +
        LocalHeaderSize +
        headerData.getUint16(26, true) +
        headerData.getUint16(28, true);
      if (dataStart + entry.compressedSize > directoryOffset) {
        invalid(`compressed entry data exceeds bounds: ${name}`);
      }
      const localName = await readExact(
        entry.localHeaderOffset + LocalHeaderSize,
        entry.localHeaderOffset + LocalHeaderSize + headerData.getUint16(26, true)
      );
      if (
        new TextDecoder().decode(localName) !== name ||
        headerData.getUint16(8, true) !== entry.method
      ) {
        invalid(`local and central entry metadata differ: ${name}`);
      }
      const compressed = await readExact(dataStart, dataStart + entry.compressedSize);
      if (entry.method === StoredMethod) {
        if (compressed.byteLength !== entry.uncompressedSize) {
          invalid(`uncompressed size differs: ${name}`);
        }
        return compressed;
      }
      if (entry.method === DeflatedMethod) {
        let expanded: Uint8Array;
        try {
          expanded = inflateSync(compressed, { out: new Uint8Array(entry.uncompressedSize) });
        } catch (cause) {
          if (
            !(cause instanceof Error) ||
            !("code" in cause) ||
            typeof cause.code !== "number" ||
            !InvalidDeflateCodes.has(cause.code)
          ) {
            throw cause;
          }
          throw new DeckPackageParseError(
            [{ path: [name], message: "Could not decompress ZIP entry" }],
            { cause }
          );
        }
        if (expanded.byteLength !== entry.uncompressedSize) {
          invalid(`uncompressed size differs: ${name}`);
        }
        return expanded;
      }
      return invalid(`unsupported compression for ${name}`);
    },
  };
}
