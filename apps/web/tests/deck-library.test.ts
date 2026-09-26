import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type { DeckStorage, StoredDeckObject } from "@/server/decks/deck-storage";

import { createDeckLibrary } from "@/server/decks/deck-library";

const timestamp = "2026-09-25T00:00:00.000Z";
const timestampMs = Date.parse(timestamp);
const scalingId = "3f9c2d4e-8a61-4b7f-9c2e-1d5a6b7c8d90";
const reactId = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const lessonId = "4f1c0d5e-6a7b-4c8d-9e0f-1a2b3c4d5e6f";
const cardIds = ["0b7e6f1a-2c3d-4e5f-8a9b-0c1d2e3f4a5b", "1c8f7a2b-3d4e-4f5a-9b0c-1d2e3f4a5b6c"];

type PackageOptions = Readonly<{
  id: string;
  title: string;
  version?: number;
  withLesson?: boolean;
  audioBytes?: number;
}>;

// Mirrors the mobile writer's layout: deck.json, then audio, then lessons.
function deckPackage({
  id,
  title,
  version = 1,
  withLesson = false,
  audioBytes = 0,
}: PackageOptions) {
  const document = {
    cards: [
      { answer: "More machines.", question: "What is horizontal scaling?" },
      { answer: "A bigger machine.", question: "What is vertical scaling?" },
    ].map((card, order) => ({
      answer: card.answer,
      createdAt: timestamp,
      id: cardIds[order] ?? "",
      order,
      question: card.question,
      updatedAt: timestamp,
    })),
    createdAt: timestamp,
    description: `${title} basics`,
    id,
    ...(withLesson ? { lessons: [{ id: lessonId, order: 0, title: "Why scale" }] } : {}),
    title,
    updatedAt: timestamp,
    version,
  };
  const files: Record<string, Uint8Array> = { "deck.json": strToU8(JSON.stringify(document)) };
  if (audioBytes > 0) {
    // Random-looking bytes do not compress, like real MP3 audio.
    files[`audio/${cardIds[0]}.answer.mp3`] = Uint8Array.from(
      { length: audioBytes },
      (_, index) => (index * 7919) % 251
    );
  }
  if (withLesson) {
    files[`lessons/${lessonId}.md`] = strToU8("# Why scale\n\nLoad grows.");
  }
  return zipSync(files);
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
      { id: lessonId, markdown: "# Why scale\n\nLoad grows.", order: 0, title: "Why scale" },
    ]);
    // The end-of-archive scan reads at most 64 KiB; everything else is small entries.
    expect(storage.bytesRead).toBeLessThan(80_000);
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
      deckPackage({ id: scalingId, title: "Scaling", version: 2 }),
      "r2"
    );
    const cached = await library.findDeck(scalingId);
    now += 1001;
    const refreshed = await library.findDeck(scalingId);

    expect(cached?.version).toBe(1);
    expect(refreshed?.version).toBe(2);
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
    storage.put(key, deckPackage({ id: scalingId, title: "Scaling", version: 2 }), "r2");
    now += 11;
    const updated = await library.getDeckContent(scalingId);
    expect(updated?.version).toBe(2);

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
        if (fail && strFromU8(bytes).startsWith("# Why scale")) {
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
