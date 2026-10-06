import {
  createDeckPackage,
  parseDeckPackage,
  parseDeckManifest,
  DeckPackageParseError,
  UnsupportedDeckSchemaError,
} from "@flashcard-reels/deck-contract";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type { DeckStorage, StoredDeckObject } from "@/server/decks/deck-storage";

import { createDeckLibrary } from "@/server/decks/deck-library";

const timestamp = "2026-09-25T00:00:00.000Z";
const timestampMs = Date.parse(timestamp);
const scalingId = "3f9c2d4e-8a61-4b7f-9c2e-1d5a6b7c8d90";
const reactId = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const lessonId = "4f1c0d5e-6a7b-4c8d-9e0f-1a2b3c4d5e6f";
const sectionId = "c4f02b37-b8c4-4d17-8430-15c12614c012";
const authorId = "a5f43c1e-7890-4abc-8def-1234567890ab";
const cardIds = ["0b7e6f1a-2c3d-4e5f-8a9b-0c1d2e3f4a5b", "1c8f7a2b-3d4e-4f5a-9b0c-1d2e3f4a5b6c"];

type PackageOptions = Readonly<{
  id: string;
  title: string;
  revision?: number;
  withLesson?: boolean;
  audioBytes?: number;
}>;

// Produce valid fixtures through the shared public writer.
function deckPackage({
  id,
  title,
  revision = 1,
  withLesson = false,
  audioBytes = 0,
}: PackageOptions) {
  const document = {
    cards: [
      { answer: "More machines.", question: "What is horizontal scaling?" },
      { answer: "A bigger machine.", question: "What is vertical scaling?" },
    ].map((card, index) => ({
      answer: card.answer,
      audio: index === 0 && audioBytes > 0,
      createdAt: timestamp,
      id: cardIds[index] ?? "",
      lessonId: null,
      lessonSectionId: null,
      question: card.question,
      updatedAt: timestamp,
    })),
    authorId,
    createdAt: timestamp,
    description: `${title} basics`,
    id,
    lessons: withLesson
      ? [
          {
            id: lessonId,
            title: "Why scale",
            intro: "Load grows.",
            sections: [{ id: sectionId, title: "Vertical scaling", body: "More resources." }],
          },
        ]
      : [],
    revision,
    schema: 4 as const,
    title,
    updatedAt: timestamp,
  };
  const audio = new Map<string, Uint8Array>();
  if (audioBytes > 0) {
    audio.set(
      cardIds[0] ?? "",
      Uint8Array.from({ length: audioBytes }, (_, index) => (index * 7919) % 251)
    );
  }
  return createDeckPackage({ deck: document, audio });
}
class MemoryStorage implements DeckStorage {
  bytesRead = 0;
  readonly readsByKey = new Map<string, number>();
  private readonly objects = new Map<string, Readonly<{ bytes: Uint8Array; revision: string }>>();

  put(key: string, bytes: Uint8Array, revision = "r1") {
    this.objects.set(key, { bytes, revision });
  }

  remove(key: string) {
    this.objects.delete(key);
  }

  async listDeckObjects(): Promise<StoredDeckObject[]> {
    return [...this.objects].map(([key, object]) => ({
      key,
      revision: object.revision,
      size: object.bytes.byteLength,
    }));
  }

  async readRange(key: string, start: number, end: number): Promise<Uint8Array> {
    const object = this.objects.get(key);
    if (!object) {
      throw new Error(`Missing ${key}`);
    }
    const slice = object.bytes.slice(start, end);
    this.bytesRead += slice.byteLength;
    this.readsByKey.set(key, (this.readsByKey.get(key) ?? 0) + 1);
    return slice;
  }

  async createDownload(key: string) {
    return {
      bytes: this.objects.get(key)?.bytes ?? new Uint8Array(),
      fileName: key,
      kind: "file" as const,
    };
  }
}

describe("deck library", () => {
  it("reports corrupt DEFLATE data as a typed package error", async () => {
    const storage = new MemoryStorage();
    const bytes = deckPackage({ id: scalingId, title: "Scaling" });
    const metadata = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataStart = 30 + metadata.getUint16(26, true) + metadata.getUint16(28, true);
    // Reserved DEFLATE block type, with otherwise valid ZIP metadata.
    bytes[dataStart] = 7;
    storage.put("decks/scaling.fcrdeck", bytes);
    const errors: unknown[] = [];
    expect(
      await createDeckLibrary({
        storage,
        onUnreadableDeck: (_key, error) => errors.push(error),
      }).listDecks()
    ).toEqual([]);
    expect(errors[0]).toBeInstanceOf(DeckPackageParseError);
    expect(errors[0]).toMatchObject({
      issues: [{ path: ["deck.json"], message: "Could not decompress ZIP entry" }],
      cause: { code: 1 },
    });
  });
  it.each([1, 2, 3])("skips schema %s with a typed unsupported-format error", async (schema) => {
    const storage = new MemoryStorage();
    const files = unzipSync(deckPackage({ id: scalingId, title: "Scaling" }));
    const manifest = parseDeckManifest(files["deck.json"] ?? new Uint8Array());
    files["deck.json"] = strToU8(JSON.stringify({ ...manifest, schema }));
    storage.put("decks/scaling.fcrdeck", zipSync(files));
    const errors: unknown[] = [];
    expect(
      await createDeckLibrary({
        storage,
        onUnreadableDeck: (_key, error) => errors.push(error),
      }).listDecks()
    ).toEqual([]);
    expect(errors[0]).toBeInstanceOf(UnsupportedDeckSchemaError);
    expect(errors[0]).toMatchObject({ context: { schema } });
  });

  it("reports invalid intro and section bodies together and preserves the downloadable package", async () => {
    const storage = new MemoryStorage();
    const key = "decks/scaling.fcrdeck";
    const valid = deckPackage({ id: scalingId, title: "Scaling", withLesson: true });
    storage.put(key, valid);
    const download = await storage.createDownload(key);
    expect(parseDeckPackage(download.bytes).deck.lessons[0]?.sections[0]?.id).toBe(sectionId);
    const files = unzipSync(valid);
    files[`lessons/${lessonId}/intro.md`] = strToU8("[Link](https://example.com)");
    files[`lessons/${lessonId}/${sectionId}.md`] = strToU8("# Forbidden heading");
    storage.put(key, zipSync(files), "r2");
    await expect(createDeckLibrary({ storage }).getDeckContent(scalingId)).rejects.toMatchObject({
      code: "DECK_PACKAGE_INVALID",
      issues: [
        expect.objectContaining({ lessonId, sectionId: null, line: 1 }),
        expect.objectContaining({ lessonId, sectionId, line: 1 }),
      ],
    });
  });

  it("resolves section-linked packages without audio and rejects broken destinations", async () => {
    const storage = new MemoryStorage();
    const files = unzipSync(
      deckPackage({ id: scalingId, title: "Scaling", withLesson: true, audioBytes: 400_000 })
    );
    const manifest = parseDeckManifest(files["deck.json"] ?? new Uint8Array());

    for (const card of manifest.cards) {
      card.lessonId = lessonId;
      card.lessonSectionId = sectionId;
    }
    files["deck.json"] = strToU8(JSON.stringify(manifest));
    storage.put("decks/scaling.fcrdeck", zipSync(files));
    const content = await createDeckLibrary({ storage }).getDeckContent(scalingId);
    expect(content?.cards.map((card) => card.lessonSectionId)).toEqual([sectionId, sectionId]);
    expect(storage.bytesRead).toBeLessThan(80_000);

    files[`lessons/${lessonId}/${sectionId}.md`] = strToU8(
      "# Heading is forbidden\nMore resources."
    );
    storage.put("decks/scaling.fcrdeck", zipSync(files), "r2");
    await expect(createDeckLibrary({ storage }).getDeckContent(scalingId)).rejects.toBeInstanceOf(
      DeckPackageParseError
    );
  });
  it("lists published decks by title with their card, lesson, and audio counts", async () => {
    const storage = new MemoryStorage();
    storage.put(
      "decks/scaling.fcrdeck",
      deckPackage({ audioBytes: 100, id: scalingId, title: "Scaling", withLesson: true })
    );
    storage.put("decks/react.fcrdeck", deckPackage({ id: reactId, title: "React" }));

    const decks = await createDeckLibrary({ storage }).listDecks();

    expect(decks.map((deck) => deck.title)).toEqual(["React", "Scaling"]);
    expect(decks[1]).toMatchObject({ audioCount: 1, cardCount: 2, id: scalingId, lessonCount: 1 });
  });

  it("reads cards and lessons without downloading the audio", async () => {
    const storage = new MemoryStorage();
    const audioBytes = 400_000;
    storage.put(
      "decks/scaling.fcrdeck",
      deckPackage({ audioBytes, id: scalingId, title: "Scaling", withLesson: true })
    );

    const deck = await createDeckLibrary({ storage }).getDeckContent(scalingId);

    expect(deck?.cards.map((card) => card.question)).toEqual([
      "What is horizontal scaling?",
      "What is vertical scaling?",
    ]);
    expect(deck?.lessons).toEqual([
      {
        id: lessonId,
        intro: "Load grows.",
        title: "Why scale",
        sections: [{ id: sectionId, title: "Vertical scaling", body: "More resources." }],
      },
    ]);
    // The end-of-archive scan reads at most 64 KiB; everything else is small entries.
    expect(storage.bytesRead).toBeLessThan(80_000);
  });

  it("keeps manifest array order and rejects assets that disagree with audio flags", async () => {
    const storage = new MemoryStorage();
    const original = unzipSync(
      deckPackage({ audioBytes: 100, id: scalingId, title: "Scaling", withLesson: true })
    );
    const manifest = parseDeckManifest(original["deck.json"] ?? new Uint8Array());
    manifest.cards.reverse();
    original["deck.json"] = strToU8(JSON.stringify(manifest));
    storage.put("decks/scaling.fcrdeck", zipSync(original));

    const library = createDeckLibrary({ storage });
    const content = await library.getDeckContent(scalingId);
    expect(content?.cards.map((card) => card.id)).toEqual([cardIds[1], cardIds[0]]);

    const audioCard = manifest.cards.find((card) => card.audio);
    if (!audioCard) {
      throw new Error("Expected an audio card");
    }
    audioCard.audio = false;
    original["deck.json"] = strToU8(JSON.stringify(manifest));
    storage.put("decks/scaling.fcrdeck", zipSync(original), "r2");
    expect(await createDeckLibrary({ storage }).listDecks()).toEqual([]);
  });

  it("skips an unreadable upload instead of failing the whole catalog", async () => {
    const storage = new MemoryStorage();
    const unreadable: string[] = [];
    storage.put("decks/scaling.fcrdeck", deckPackage({ id: scalingId, title: "Scaling" }));
    storage.put("decks/broken.fcrdeck", strToU8("not a zip archive"));

    const decks = await createDeckLibrary({
      onUnreadableDeck: (key) => unreadable.push(key),
      storage,
    }).listDecks();

    expect(decks.map((deck) => deck.id)).toEqual([scalingId]);
    expect(unreadable).toEqual(["decks/broken.fcrdeck"]);
  });

  it("rejects an oversized declared manifest before decompressing it", async () => {
    const storage = new MemoryStorage();
    const bytes = deckPackage({ id: scalingId, title: "Scaling" });
    const metadata = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let centralEntry = -1;
    for (let offset = 0; offset <= bytes.byteLength - 46; offset += 1) {
      if (metadata.getUint32(offset, true) === 0x02014b50) {
        centralEntry = offset;
        break;
      }
    }
    if (centralEntry < 0) {
      throw new Error("Fixture has no central directory entry");
    }
    metadata.setUint32(centralEntry + 24, 8 * 1024 * 1024 + 1, true);
    storage.put("decks/scaling.fcrdeck", bytes);

    expect(await createDeckLibrary({ storage }).listDecks()).toEqual([]);
  });

  it("returns null for a deck that is not published", async () => {
    const library = createDeckLibrary({ storage: new MemoryStorage() });

    expect(await library.findDeck(scalingId)).toBeNull();
    expect(await library.getDeckContent(scalingId)).toBeNull();
  });

  it("picks up a re-published deck once the listing refreshes", async () => {
    const storage = new MemoryStorage();
    let now = timestampMs;
    const library = createDeckLibrary({ listingTtlMs: 1000, now: () => now, storage });
    storage.put("decks/scaling.fcrdeck", deckPackage({ id: scalingId, title: "Scaling" }), "r1");
    await library.listDecks();

    storage.put(
      "decks/scaling.fcrdeck",
      deckPackage({ id: scalingId, title: "Scaling", revision: 2 }),
      "r2"
    );
    const cached = await library.findDeck(scalingId);
    now += 1001;
    const refreshed = await library.findDeck(scalingId);

    expect(cached?.revision).toBe(1);
    expect(refreshed?.revision).toBe(2);
  });

  it("reuses summaries and content until their absolute TTL expires", async () => {
    const storage = new MemoryStorage();
    storage.put("decks/scaling.fcrdeck", deckPackage({ id: scalingId, title: "Scaling" }));
    let now = timestampMs;
    const library = createDeckLibrary({ storage, now: () => now, packageTtlMs: 100 });
    const summary = await library.findDeck(scalingId);
    const content = await library.getDeckContent(scalingId);
    const initialBytesRead = storage.bytesRead;

    now += 90;
    expect(await library.findDeck(scalingId)).toEqual(summary);
    expect(await library.getDeckContent(scalingId)).toEqual(content);
    expect(storage.bytesRead).toBe(initialBytesRead);

    now += 11;
    expect(await library.findDeck(scalingId)).toEqual(summary);
    expect(await library.getDeckContent(scalingId)).toEqual(content);
    expect(storage.bytesRead).toBeGreaterThan(initialBytesRead);
  });

  it("evicts the least recently used content when the entry limit is reached", async () => {
    const storage = new MemoryStorage();
    storage.put("decks/scaling.fcrdeck", deckPackage({ id: scalingId, title: "Scaling" }));
    storage.put("decks/react.fcrdeck", deckPackage({ id: reactId, title: "React" }));
    storage.put("decks/third.fcrdeck", deckPackage({ id: lessonId, title: "Third" }));
    const library = createDeckLibrary({ storage, now: () => timestampMs, maxCachedPackages: 2 });
    await library.getDeckContent(scalingId);
    await library.getDeckContent(reactId);
    await library.getDeckContent(scalingId);

    // A catalog larger than the cache must still load successfully, including concurrent reads.
    expect(await library.listDecks()).toHaveLength(3);
    expect(await library.getDeckContent(lessonId)).not.toBeNull();
    // Compare retained and evicted previews under the same summary-cache pressure.
    const beforeScaling = storage.readsByKey.get("decks/scaling.fcrdeck") ?? 0;
    const scaling = await library.getDeckContent(scalingId);
    expect(scaling?.id).toBe(scalingId);
    const scalingReads = (storage.readsByKey.get("decks/scaling.fcrdeck") ?? 0) - beforeScaling;
    const beforeReact = storage.readsByKey.get("decks/react.fcrdeck") ?? 0;
    const react = await library.getDeckContent(reactId);
    expect(react?.id).toBe(reactId);
    const reactReads = (storage.readsByKey.get("decks/react.fcrdeck") ?? 0) - beforeReact;
    expect(reactReads).toBeGreaterThan(scalingReads);
  });

  it("evicts content to stay within the byte budget", async () => {
    const storage = new MemoryStorage();
    storage.put("decks/scaling.fcrdeck", deckPackage({ id: scalingId, title: "Scaling" }));
    storage.put("decks/react.fcrdeck", deckPackage({ id: reactId, title: "React" }));
    const sample = await createDeckLibrary({ storage, now: () => timestampMs }).getDeckContent(
      scalingId
    );
    const library = createDeckLibrary({
      storage,
      now: () => timestampMs,
      maxContentCacheBytes: Buffer.byteLength(JSON.stringify(sample), "utf8") + 10,
    });
    await library.getDeckContent(scalingId);
    await library.getDeckContent(reactId);
    const bytesAfterLoading = storage.bytesRead;

    await library.getDeckContent(reactId);
    expect(storage.bytesRead).toBe(bytesAfterLoading);
    await library.getDeckContent(scalingId);
    expect(storage.bytesRead).toBeGreaterThan(bytesAfterLoading);
  });

  it("serves an oversized preview without retaining it", async () => {
    const storage = new MemoryStorage();
    storage.put("decks/scaling.fcrdeck", deckPackage({ id: scalingId, title: "Scaling" }));
    const library = createDeckLibrary({ storage, now: () => timestampMs, maxContentCacheBytes: 1 });
    const first = await library.getDeckContent(scalingId);

    expect(first?.id).toBe(scalingId);
    const bytesAfterLoading = storage.bytesRead;
    expect(await library.getDeckContent(scalingId)).toEqual(first);
    expect(storage.bytesRead).toBeGreaterThan(bytesAfterLoading);
  });

  it("drops removed and superseded revisions when the listing refreshes", async () => {
    const storage = new MemoryStorage();
    const key = "decks/scaling.fcrdeck";
    const originalBytes = deckPackage({ id: scalingId, title: "Scaling" });
    storage.put(key, originalBytes, "r1");
    let now = timestampMs;
    const library = createDeckLibrary({ storage, now: () => now, listingTtlMs: 10 });
    const first = await library.getDeckContent(scalingId);
    storage.put(key, deckPackage({ id: scalingId, title: "Scaling", revision: 2 }), "r2");
    now += 11;
    const updated = await library.getDeckContent(scalingId);
    expect(updated?.revision).toBe(2);

    storage.put(key, originalBytes, "r1");
    now += 11;
    await library.findDeck(scalingId);
    const bytesBeforeRepublishing = storage.bytesRead;
    const republished = await library.getDeckContent(scalingId);
    expect(republished).toEqual(first);
    expect(storage.bytesRead).toBeGreaterThan(bytesBeforeRepublishing);

    storage.remove(key);
    now += 11;
    expect(await library.listDecks()).toEqual([]);
    storage.put(key, originalBytes, "r1");
    now += 11;
    await library.findDeck(scalingId);
    const bytesBeforeReinstalling = storage.bytesRead;
    expect(await library.getDeckContent(scalingId)).toEqual(republished);
    expect(storage.bytesRead).toBeGreaterThan(bytesBeforeReinstalling);
  });

  it("deduplicates simultaneous content loads and retries a failed load", async () => {
    const storage = new MemoryStorage();
    const key = "decks/scaling.fcrdeck";
    const validBytes = deckPackage({ id: scalingId, title: "Scaling", withLesson: true });
    let fail = true;
    const failingStorage: DeckStorage = {
      listDeckObjects: () => storage.listDeckObjects(),
      createDownload: (objectKey) => storage.createDownload(objectKey),
      readRange: async (objectKey, start, end) => {
        // Summary reads succeed; fail when the content reader reaches the lesson data.
        const bytes = await storage.readRange(objectKey, start, end);
        if (fail && strFromU8(bytes).startsWith("Load grows.")) {
          throw new Error("Temporary storage failure");
        }
        return bytes;
      },
    };
    // Store lesson bytes uncompressed so the fault is independent of ZIP offsets.
    const files = unzipSync(validBytes);
    storage.put(key, zipSync(files, { level: 0 }));
    const library = createDeckLibrary({ storage: failingStorage, now: () => timestampMs });
    await expect(library.getDeckContent(scalingId)).rejects.toThrow("Temporary storage failure");
    fail = false;
    const bytesBeforeRetry = storage.bytesRead;
    const [first, second] = await Promise.all([
      library.getDeckContent(scalingId),
      library.getDeckContent(scalingId),
    ]);
    const retryBytes = storage.bytesRead - bytesBeforeRetry;
    expect(first?.lessons).toHaveLength(1);
    expect(second).toEqual(first);

    const separateLibrary = createDeckLibrary({ storage, now: () => timestampMs });
    await separateLibrary.findDeck(scalingId);
    const bytesBeforeSingleLoad = storage.bytesRead;
    await separateLibrary.getDeckContent(scalingId);
    expect(retryBytes).toBe(storage.bytesRead - bytesBeforeSingleLoad);
  });
});
