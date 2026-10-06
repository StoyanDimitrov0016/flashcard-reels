import type { QueryClient } from "@tanstack/react-query";

/**
 * The first parts of every query key. Feature query factories build their keys from these, so a
 * change can invalidate every read it affects with one partial-key match.
 */
export const queryScopes = {
  decks: ["decks"],
  lessons: ["lessons"],
  flashcards: ["flashcards"],
  learningProgress: ["learning-progress"],
  savedProgress: ["saved-progress"],
  /** Feeds that open or resume a session; they are rebuilt from scratch after a change. */
  resumableFeeds: ["study", "feed", "resume"],
  /** Feeds that replaced a session for one Focus start; they never run twice. */
  focusStartFeeds: ["study", "feed", "focus-start"],
  focusedSession: ["study", "focused-session"],
} as const;

type QueryScope = (typeof queryScopes)[keyof typeof queryScopes];

/** What a write changed. */
export type DataChange =
  /** Decks were installed, updated, or removed. */
  | "deck-content"
  /** Reviews, resets, restores, or saved-progress decisions changed what was learned. */
  | "learning-progress"
  /** A deck's theme changed. */
  | "theme-selection";

const invalidatedScopes: Readonly<Record<DataChange, readonly QueryScope[]>> = {
  "deck-content": [
    queryScopes.decks,
    queryScopes.lessons,
    queryScopes.flashcards,
    queryScopes.savedProgress,
    queryScopes.focusedSession,
  ],
  "learning-progress": [
    queryScopes.learningProgress,
    queryScopes.decks,
    queryScopes.savedProgress,
    queryScopes.focusedSession,
  ],
  "theme-selection": [queryScopes.decks],
};

const changesRebuildingFeeds: ReadonlySet<DataChange> = new Set([
  "deck-content",
  "learning-progress",
]);

/**
 * Invalidates every read the changes affect, once. Pass all of a write's changes together: a
 * prepared feed is rebuilt once, because each rebuild opens the session again.
 *
 * A prepared feed may reference cards or progress that just changed, so it is dropped rather than
 * shown while it refetches. Focus-start feeds are left alone: rerunning one would replace its
 * session again.
 */
export async function invalidateChangedData(
  client: QueryClient,
  changes: readonly DataChange[]
): Promise<void> {
  const scopes = new Set(changes.flatMap((change) => invalidatedScopes[change]));
  await Promise.all([
    ...[...scopes].map((queryKey) => client.invalidateQueries({ queryKey })),
    ...(changes.some((change) => changesRebuildingFeeds.has(change))
      ? [client.resetQueries({ queryKey: queryScopes.resumableFeeds })]
      : []),
  ]);
}
