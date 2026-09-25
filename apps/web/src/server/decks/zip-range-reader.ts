import { inflateSync } from "fflate";

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

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function invalid(message: string): never {
  throw new Error(`Invalid deck package: ${message}`);
}

function findEndRecord(tail: Uint8Array): number {
  const data = view(tail);
  for (let offset = tail.byteLength - EndRecordSize; offset >= 0; offset -= 1) {
    if (data.getUint32(offset, true) === EndOfCentralDirectorySignature) {
      return offset;
    }
  }
  return invalid("missing end-of-central-directory record");
}

function parseCentralDirectory(directory: Uint8Array, entryCount: number): ZipEntry[] {
  const data = view(directory);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
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
    entries.push({
      compressedSize: data.getUint32(offset + 20, true),
      localHeaderOffset: data.getUint32(offset + 42, true),
      method: data.getUint16(offset + 10, true),
      name: decoder.decode(directory.subarray(offset + 46, offset + 46 + nameLength)),
      uncompressedSize: data.getUint32(offset + 24, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export async function openZipRangeReader(
  size: number,
  readRange: ReadRange
): Promise<ZipRangeReader> {
  const tailStart = Math.max(0, size - EndRecordSize - MaximumCommentSize);
  const tail = await readRange(tailStart, size);
  const endRecord = findEndRecord(tail);
  const endData = view(tail);
  const entryCount = endData.getUint16(endRecord + 10, true);
  const directorySize = endData.getUint32(endRecord + 12, true);
  const directoryOffset = endData.getUint32(endRecord + 16, true);
  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    invalid("ZIP64 archives are not supported");
  }
  if (directoryOffset + directorySize > size) {
    invalid("central directory exceeds the archive");
  }

  const directory =
    directoryOffset >= tailStart
      ? tail.subarray(directoryOffset - tailStart, directoryOffset - tailStart + directorySize)
      : await readRange(directoryOffset, directoryOffset + directorySize);
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
      const header = await readRange(
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
      const compressed = await readRange(dataStart, dataStart + entry.compressedSize);
      if (entry.method === StoredMethod) {
        return compressed;
      }
      if (entry.method === DeflatedMethod) {
        return inflateSync(compressed, { out: new Uint8Array(entry.uncompressedSize) });
      }
      return invalid(`unsupported compression for ${name}`);
    },
  };
}
