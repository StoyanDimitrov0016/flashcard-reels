import { rejectDeckPackage } from "./reject-deck-package.ts";

const EndRecordSignature = 0x06054b50;
const CentralEntrySignature = 0x02014b50;
const LocalHeaderSignature = 0x04034b50;
const Zip64LocatorSignature = 0x07064b50;
const EndRecordBytes = 22;
const CentralEntryBytes = 46;
const LocalHeaderBytes = 30;
const MaximumCommentBytes = 65_535;

function invalidMetadata(message: string): never {
  rejectDeckPackage(`Invalid ZIP metadata: ${message}`);
}

function findEndRecord(view: DataView, size: number): number {
  const earliest = Math.max(0, size - EndRecordBytes - MaximumCommentBytes);
  for (let offset = size - EndRecordBytes; offset >= earliest; offset -= 1) {
    if (
      view.getUint32(offset, true) === EndRecordSignature &&
      offset + EndRecordBytes + view.getUint16(offset + 20, true) === size
    ) {
      return offset;
    }
  }
  return invalidMetadata("missing end-of-central-directory record");
}

function matchingNames(bytes: Uint8Array, left: number, right: number, length: number): boolean {
  for (let index = 0; index < length; index += 1) {
    if (bytes[left + index] !== bytes[right + index]) {
      return false;
    }
  }
  return true;
}

/** Verify the directory and declared entry bounds before fflate allocates output buffers. */
export function validateZipMetadata(bytes: Uint8Array): void {
  if (bytes.byteLength < EndRecordBytes) {
    invalidMetadata("missing end-of-central-directory record");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEndRecord(view, bytes.byteLength);
  if (end >= 20 && view.getUint32(end - 20, true) === Zip64LocatorSignature) {
    invalidMetadata("ZIP64 archives are not supported");
  }

  const disk = view.getUint16(end + 4, true);
  const directoryDisk = view.getUint16(end + 6, true);
  const diskEntries = view.getUint16(end + 8, true);
  const entryCount = view.getUint16(end + 10, true);
  const directoryBytes = view.getUint32(end + 12, true);
  const directoryOffset = view.getUint32(end + 16, true);
  if (disk !== 0 || directoryDisk !== 0 || diskEntries !== entryCount) {
    invalidMetadata("multi-disk archives are not supported");
  }
  if (entryCount === 0xffff || directoryBytes === 0xffffffff || directoryOffset === 0xffffffff) {
    invalidMetadata("ZIP64 archives are not supported");
  }
  if (directoryOffset + directoryBytes !== end) {
    invalidMetadata("central-directory bounds are inconsistent");
  }

  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + CentralEntryBytes > end ||
      view.getUint32(offset, true) !== CentralEntrySignature
    ) {
      invalidMetadata("malformed central-directory entry");
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedBytes = view.getUint32(offset + 20, true);
    const uncompressedBytes = view.getUint32(offset + 24, true);
    const nameBytes = view.getUint16(offset + 28, true);
    const extraBytes = view.getUint16(offset + 30, true);
    const commentBytes = view.getUint16(offset + 32, true);
    const startDisk = view.getUint16(offset + 34, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (
      compressedBytes === 0xffffffff ||
      uncompressedBytes === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      invalidMetadata("ZIP64 archives are not supported");
    }
    if (startDisk !== 0 || (flags & 1) !== 0 || (method !== 0 && method !== 8)) {
      invalidMetadata("unsupported entry structure");
    }

    const next = offset + CentralEntryBytes + nameBytes + extraBytes + commentBytes;
    if (next > end) {
      invalidMetadata("central-directory entry exceeds bounds");
    }
    if (localOffset + LocalHeaderBytes > directoryOffset) {
      invalidMetadata("local-file header exceeds bounds");
    }
    if (view.getUint32(localOffset, true) !== LocalHeaderSignature) {
      invalidMetadata("local-file header is missing");
    }

    const localNameBytes = view.getUint16(localOffset + 26, true);
    const localExtraBytes = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + LocalHeaderBytes + localNameBytes + localExtraBytes;
    if (dataOffset + compressedBytes > directoryOffset) {
      invalidMetadata("compressed entry data exceeds bounds");
    }
    if (
      nameBytes !== localNameBytes ||
      !matchingNames(bytes, offset + CentralEntryBytes, localOffset + LocalHeaderBytes, nameBytes)
    ) {
      invalidMetadata("local and central entry names differ");
    }
    offset = next;
  }

  if (offset !== end) {
    invalidMetadata("central-directory size does not match its entries");
  }
}
