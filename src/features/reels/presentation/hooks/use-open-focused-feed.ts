import { useRouter } from "expo-router";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useFeedScope } from "@/features/reels/presentation/context/feed-scope-context";
import { openFocusedFeed } from "@/features/reels/presentation/open-focused-feed";

export function useOpenFocusedFeed() {
  const router = useRouter();
  const { startFocusedFeed } = useFeedScope();

  return (deckId: DeckId, anchorFlashcardId?: string) => {
    openFocusedFeed(deckId, startFocusedFeed, router.navigate, anchorFlashcardId);
  };
}
