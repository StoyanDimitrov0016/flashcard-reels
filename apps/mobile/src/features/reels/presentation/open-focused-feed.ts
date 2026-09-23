import type { DeckId } from "@/features/decks/domain/deck.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";

export type FocusedCardState = Readonly<{
  cardId: string;
  recallLevel: RecallLevel | null;
  revealed: boolean;
}>;
export type FocusedFeedOptions = Readonly<{ cardState?: FocusedCardState }>;
type StartFocusedFeed = (
  deckId: DeckId,
  anchorFlashcardId?: string,
  options?: FocusedFeedOptions
) => void;

export function openFocusedFeed(
  deckId: DeckId,
  startFocusedFeed: StartFocusedFeed,
  navigate: (href: "/(tabs)/(study)/focus") => void,
  anchorFlashcardId?: string,
  options?: FocusedFeedOptions
): void {
  if (anchorFlashcardId === undefined && options === undefined) {
    startFocusedFeed(deckId);
  } else if (options === undefined) {
    startFocusedFeed(deckId, anchorFlashcardId);
  } else {
    startFocusedFeed(deckId, anchorFlashcardId, options);
  }
  navigate("/(tabs)/(study)/focus");
}
