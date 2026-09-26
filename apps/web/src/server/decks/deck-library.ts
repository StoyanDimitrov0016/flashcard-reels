import "server-only";
import { LRUCache } from "lru-cache";

import type { DeckStorage, StoredDeckObject } from "@/server/decks/deck-storage";

import {
  readDeckContent,
  readDeckSummary,
  type DeckContent,
  type DeckSummary,
} from "@/server/decks/deck-package";
import { openZipRangeReader } from "@/server/decks/zip-range-reader";

export type DeckLibrary = Readonly<{
  listDecks: () => Promise<DeckSummary[]>;
  findDeck: (deckId: string) => Promise<DeckSummary | null>;
  getDeckContent: (deckId: string) => Promise<DeckContent | null>;
}>;

type DeckLibraryOptions = Readonly<{
  storage: DeckStorage;
  now?: () => number;
  /** How long a storage listing is reused before checking for new publications. */
  listingTtlMs?: number;
  /** Absolute lifetime of parsed packages; cache hits do not extend it. */
  packageTtlMs?: number;
  /** Maximum entries in each of the summary and content caches. */
  maxCachedPackages?: number;
  /** Content budget measured by UTF-8 JSON size, excluding audio and archive bytes. */
  maxContentCacheBytes?: number;
  onUnreadableDeck?: (key: string, error: unknown) => void;
}>;

type CachedValue<T> = Readonly<{ expiresAt: number; value: Promise<T> }>;
type CachedSummary = Readonly<{ deck: DeckSummary | null }>;

const DefaultListingTtlMs = 60_000;
const DefaultPackageTtlMs = 30 * 60_000;
const DefaultMaxCachedPackages = 32;
const DefaultMaxContentCacheBytes = 8 * 1024 * 1024;

/**
 * The catalog is whatever is published in storage. Parsed packages use bounded LRU caches with
 * automatic TTL eviction. Refreshing the listing also drops removed or superseded revisions.
 */
export function createDeckLibrary({
  storage,
  now = Date.now,
  listingTtlMs = DefaultListingTtlMs,
  packageTtlMs = DefaultPackageTtlMs,
  maxCachedPackages = DefaultMaxCachedPackages,
  maxContentCacheBytes = DefaultMaxContentCacheBytes,
  onUnreadableDeck = () => {},
}: DeckLibraryOptions): DeckLibrary {
  if (!Number.isFinite(packageTtlMs) || packageTtlMs <= 0) {
    throw new Error("Package cache TTL must be a finite positive number");
  }
  let listing: CachedValue<StoredDeckObject[]> | null = null;
  const openReader = (object: StoredDeckObject) =>
    openZipRangeReader(object.size, (start, end) => storage.readRange(object.key, start, end));
  const cacheOptions = {
    // Eviction must not fail a page request that is still reading its package.
    ignoreFetchAbort: true,
    max: maxCachedPackages,
    perf: { now },
    ttl: packageTtlMs,
    ttlAutopurge: true,
    ttlResolution: 0,
  };
  const summaries = new LRUCache<string, CachedSummary, StoredDeckObject>({
    ...cacheOptions,
    fetchMethod: async (_key, _previous, { context: object }) => {
      try {
        return { deck: await readDeckSummary(await openReader(object), object.key, object.size) };
      } catch (error) {
        // One broken upload should not take the whole catalog down.
        onUnreadableDeck(object.key, error);
        return { deck: null };
      }
    },
  });
  const contents = new LRUCache<string, DeckContent, StoredDeckObject>({
    ...cacheOptions,
    fetchMethod: async (_key, _previous, { context: object }) =>
      readDeckContent(await openReader(object), object.key, object.size),
    maxSize: maxContentCacheBytes,
    sizeCalculation: (content) => Buffer.byteLength(JSON.stringify(content), "utf8"),
  });

  function listObjects(): Promise<StoredDeckObject[]> {
    if (listing && listing.expiresAt > now()) {
      return listing.value;
    }
    const value = storage.listDeckObjects().then((objects) => {
      if (listing?.value === value) {
        const revisions = new Set(objects.map(packageCacheKey));
        for (const key of summaries.keys()) {
          if (!revisions.has(key)) {
            summaries.delete(key);
          }
        }
        for (const key of contents.keys()) {
          if (!revisions.has(key)) {
            contents.delete(key);
          }
        }
      }
      return objects;
    });
    const entry = { expiresAt: now() + listingTtlMs, value };
    listing = entry;
    value.catch(() => {
      if (listing === entry) {
        listing = null;
      }
    });
    return value;
  }

  async function summaryFor(object: StoredDeckObject): Promise<DeckSummary | null> {
    const summary = await summaries.forceFetch(packageCacheKey(object), { context: object });
    return summary.deck;
  }

  async function listDecks(): Promise<DeckSummary[]> {
    const objects = await listObjects();
    const decks = await Promise.all(objects.map(summaryFor));
    return decks
      .filter((deck): deck is DeckSummary => deck !== null)
      .toSorted((left, right) => left.title.localeCompare(right.title));
  }

  async function findObject(deckId: string) {
    const objects = await listObjects();
    const decks = await Promise.all(
      objects.map(async (object) => ({ object, summary: await summaryFor(object) }))
    );
    return decks.find(({ summary }) => summary?.id === deckId) ?? null;
  }

  return {
    findDeck: async (deckId) => {
      const match = await findObject(deckId);
      return match?.summary ?? null;
    },
    getDeckContent: async (deckId) => {
      const match = await findObject(deckId);
      if (!match) {
        return null;
      }
      const { object } = match;
      return contents.forceFetch(packageCacheKey(object), { context: object });
    },
    listDecks,
  };
}

function packageCacheKey(object: StoredDeckObject): string {
  return `${object.key}@${object.revision}`;
}
