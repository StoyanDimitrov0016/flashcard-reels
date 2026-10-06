import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { PreparedReelFeed } from "@/features/study/domain/study-feed";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";

import { useReels } from "@/features/reels/presentation/dependencies/use-reels";
import { studyQueries } from "@/features/reels/presentation/queries/study-queries";

type PreparedReelFeedOptions = Readonly<{
  scope: StudySessionScope;
  deckId: DeckId | null;
  anchorFlashcardId?: string | null;
  /** Set when this feed starts Focus by replacing the deck's session; that start's revision. */
  focusStartRevision?: number | null;
}>;

/** The scope's prepared feed, or null while it is being prepared or rebuilt after a change. */
export function usePreparedReelFeed({
  scope,
  deckId,
  anchorFlashcardId = null,
  focusStartRevision = null,
}: PreparedReelFeedOptions): PreparedReelFeed | null {
  const { data } = useQuery(
    studyQueries.feed(useReels(), { scope, deckId, anchorFlashcardId, focusStartRevision })
  );

  return data ?? null;
}
