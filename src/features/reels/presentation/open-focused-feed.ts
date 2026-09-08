import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";

type StartFocusedFeed = (deckId: DeckId, strategy?: StudySessionStrategy) => void;

export function openFocusedFeed(
  deckId: DeckId,
  startFocusedFeed: StartFocusedFeed,
  navigate: (href: "/(tabs)/focus") => void,
  confirm: () => void
): void {
  startFocusedFeed(deckId, "shuffle");
  confirm();
  navigate("/(tabs)/focus");
}
