import type { DeckId } from "@/features/decks/domain/deck.model";

type StartFocusedFeed = (deckId: DeckId, anchorFlashcardId?: string) => void;

export function openFocusedFeed(
  deckId: DeckId,
  startFocusedFeed: StartFocusedFeed,
  navigate: (href: "/(tabs)/focus") => void,
  confirm: () => void,
  anchorFlashcardId?: string
): void {
  if (anchorFlashcardId === undefined) {
    startFocusedFeed(deckId);
  } else {
    startFocusedFeed(deckId, anchorFlashcardId);
  }
  confirm();
  navigate("/(tabs)/focus");
}
