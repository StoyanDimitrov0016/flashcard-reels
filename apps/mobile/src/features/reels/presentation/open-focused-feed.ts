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
  anchorFlashcardId: string | null,
  options?: FocusedFeedOptions
) => void;

export function openFocusedFeed(
  deckId: DeckId,
  startFocusedFeed: StartFocusedFeed,
  navigate: (href: "/(tabs)/focus") => void,
  anchorFlashcardId: string | null,
  options?: FocusedFeedOptions
): void {
  startFocusedFeed(deckId, anchorFlashcardId, options);
  navigate("/(tabs)/focus");
}
