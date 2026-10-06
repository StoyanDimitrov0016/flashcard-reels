import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries, emptyDeckDetails } from "@/features/decks/presentation/queries/deck-queries";

/** `enabled` pauses reads while the deck is being deleted. */
export function useDeckDetails(deckId: DeckId | null, enabled = true) {
  const { data, isPending } = useQuery({ ...deckQueries.details(useDecks(), deckId), enabled });

  return { ...(data ?? emptyDeckDetails), loading: deckId !== null && isPending };
}
