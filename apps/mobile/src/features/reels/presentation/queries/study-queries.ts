import { queryOptions, type QueryClient } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { ReelsCapability } from "@/features/reels/presentation/dependencies/use-reels";
import type { PreparedReelFeed } from "@/features/study/domain/study-feed";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";

import { flashcardQueries } from "@/features/flashcards/presentation/queries/flashcard-queries";
import { loadViewData } from "@/shared/presentation/query/load-view-data";
import { queryScopes } from "@/shared/presentation/query/query-scopes";

export type FeedRequest = Readonly<{
  scope: StudySessionScope;
  deckId: DeckId | null;
  anchorFlashcardId: string | null;
  /** The revision of a Focus start that replaces the deck's session; null to open or resume. */
  focusStartRevision: number | null;
}>;

export type FocusedSessionEvaluation = Readonly<{
  session: StudySession | null;
  requestedDeckAvailable: boolean;
}>;

/** Opens the feed over the same cached cards the screen shows. */
async function openFeed(
  services: ReelsCapability,
  client: QueryClient,
  request: FeedRequest
): Promise<PreparedReelFeed> {
  return loadViewData(
    { operation: "reel-feed.prepare", message: "Could not prepare reel feed" },
    async () => {
      const cards = await client.query(flashcardQueries.list(services, request.deckId));
      const snapshot = await services.studyService.openFeed({
        cards,
        scope: request.scope,
        deckId: request.deckId,
        replaceExisting: request.focusStartRevision !== null,
        anchorFlashcardId: request.anchorFlashcardId,
      });
      return snapshot.feed;
    }
  );
}

async function evaluateFocusedSession(
  services: ReelsCapability,
  requestedDeckId: DeckId | null
): Promise<FocusedSessionEvaluation> {
  const session = await services.studyService.resumeFocusedSession();
  const requestedDeckAvailable =
    requestedDeckId === null || (await services.deckService.findById(requestedDeckId)) !== null;
  return { session, requestedDeckAvailable };
}

const defaultGcTime = 5 * 60 * 1000;

/**
 * Study session reads. Opening a feed has a side effect (it may create or replace a session), so
 * these queries never refetch on their own: only an explicit change rebuilds them (see
 * query-scopes). `services` are stable dependencies; every other input is part of the key.
 */
export const studyQueries = {
  /**
   * The scope's prepared feed.
   * - A resumable feed opens or resumes the session, and is rebuilt after content or progress
   *   changes.
   * - A Focus start replaces the deck's session once. Its result stays cached for the app's
   *   lifetime, so a remounted feed reuses it, and invalidation cannot rerun it. A failed start is
   *   not cached, so retrying starts again.
   */
  feed: (services: ReelsCapability, request: FeedRequest) => {
    const startsFocus = request.focusStartRevision !== null;
    return queryOptions({
      queryKey: [
        ...(startsFocus ? queryScopes.focusStartFeeds : queryScopes.resumableFeeds),
        request,
      ],
      queryFn: ({ client }) => openFeed(services, client, request),
      staleTime: startsFocus ? "static" : Infinity,
      gcTime: startsFocus ? Infinity : defaultGcTime,
    });
  },
  /** Whether a Focus session can resume, and whether its requested deck is still installed. */
  focusedSession: (services: ReelsCapability, requestedDeckId: DeckId | null) =>
    queryOptions({
      queryKey: [...queryScopes.focusedSession, requestedDeckId],
      queryFn: () => evaluateFocusedSession(services, requestedDeckId),
      staleTime: Infinity,
      throwOnError: false,
    }),
};
