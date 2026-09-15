import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";

function archive(): Uint8Array {
  return zipSync({
    "deck.json": strToU8(
      JSON.stringify({
        cards: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        description: "Metadata fixture",
        id: "00000000-0000-4000-8000-000000000001",
        title: "Metadata fixture",
        updatedAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      })
    ),
  });
}

function endRecordOffset(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("Fixture has no end record");
}

describe("deck package ZIP metadata gate", () => {
  it("rejects malformed central-directory metadata without decompressing", () => {
    const bytes = archive();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = endRecordOffset(bytes);
    view.setUint32(view.getUint32(end + 16, true), 0, true);
    const decompress = vi.fn(() => ({}));

    expect(() => new ArchiveDeckPackageReader(decompress).read(bytes)).toThrow(
      /Invalid ZIP metadata/
    );
    expect(decompress).not.toHaveBeenCalled();
  });

  it("rejects ZIP64 sentinels without decompressing", () => {
    const bytes = archive();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = endRecordOffset(bytes);
    view.setUint16(end + 8, 0xffff, true);
    view.setUint16(end + 10, 0xffff, true);
    const decompress = vi.fn(() => ({}));

    expect(() => new ArchiveDeckPackageReader(decompress).read(bytes)).toThrow(/ZIP64/);
    expect(decompress).not.toHaveBeenCalled();
  });
});
