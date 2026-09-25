import "server-only";
import type { DeckStorage } from "@/server/decks/deck-storage";

import { createDeckLibrary, type DeckLibrary } from "@/server/decks/deck-library";
import { createLocalDeckStorage } from "@/server/decks/local-deck-storage";
import { createR2DeckStorage } from "@/server/decks/r2-deck-storage";
import { getDeckStorageEnvironment } from "@/server/env";
import { logServerError } from "@/server/log";

export type { DeckCard, DeckLesson, DeckSummary } from "@/server/decks/deck-package";

let storage: DeckStorage | null = null;
let library: DeckLibrary | null = null;

export function getDeckStorage(): DeckStorage {
  if (!storage) {
    const environment = getDeckStorageEnvironment();
    storage =
      environment.kind === "local"
        ? createLocalDeckStorage(environment.directory)
        : createR2DeckStorage();
  }
  return storage;
}

/** The process-wide catalog. Its caches live as long as the server instance. */
export function getDeckLibrary(): DeckLibrary {
  library ??= createDeckLibrary({
    onUnreadableDeck: (key, error) => logServerError(`Skipping unreadable deck ${key}`, error),
    storage: getDeckStorage(),
  });
  return library;
}
