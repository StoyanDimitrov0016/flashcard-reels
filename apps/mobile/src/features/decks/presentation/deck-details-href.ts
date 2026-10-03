import type { DeckId } from "@/features/decks/domain/deck.model";

export function getDeckDetailsHref(deckId: DeckId) {
  return {
    params: { deckId },
    pathname: "/decks/[deckId]" as const,
  };
}
