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
  onUnreadableDeck?: (key: string, error: unknown) => void;
}>;

type CachedValue<T> = Readonly<{ expiresAt: number; value: Promise<T> }>;

const DefaultListingTtlMs = 60_000;
// Parsed packages are keyed by revision, so they only need to expire to bound memory.
const PackageTtlMs = 30 * 60_000;

/**
 * The catalog is whatever is published in storage. Listings are cached briefly, and parsed
 * packages are cached by object revision, so re-publishing a deck is picked up automatically.
 */
export function createDeckLibrary({
  storage,
  now = Date.now,
  listingTtlMs = DefaultListingTtlMs,
  onUnreadableDeck = () => {},
}: DeckLibraryOptions): DeckLibrary {
  let listing: CachedValue<StoredDeckObject[]> | null = null;
  const summaries = new Map<string, CachedValue<DeckSummary | null>>();
  const contents = new Map<string, CachedValue<DeckContent>>();

  function remember<T>(cache: Map<string, CachedValue<T>>, key: string, load: () => Promise<T>) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) {
      return cached.value;
    }
    const value = load();
    cache.set(key, { expiresAt: now() + PackageTtlMs, value });
    value.catch(() => cache.delete(key));
    return value;
  }

  function listObjects(): Promise<StoredDeckObject[]> {
    if (listing && listing.expiresAt > now()) {
      return listing.value;
    }
    const value = storage.listDeckObjects();
    listing = { expiresAt: now() + listingTtlMs, value };
    value.catch(() => {
      listing = null;
    });
    return value;
  }

  const openReader = (object: StoredDeckObject) =>
    openZipRangeReader(object.size, (start, end) => storage.readRange(object.key, start, end));

  function summaryFor(object: StoredDeckObject): Promise<DeckSummary | null> {
    return remember(summaries, `${object.key}@${object.revision}`, async () => {
      try {
        return await readDeckSummary(await openReader(object), object.key, object.size);
      } catch (error) {
        // One broken upload should not take the whole catalog down.
        onUnreadableDeck(object.key, error);
        return null;
      }
    });
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
      return remember(contents, `${object.key}@${object.revision}`, async () =>
        readDeckContent(await openReader(object), object.key, object.size)
      );
    },
    listDecks,
  };
}
