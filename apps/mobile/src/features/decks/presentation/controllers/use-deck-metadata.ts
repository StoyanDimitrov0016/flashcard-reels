import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries, type DeckMetadata } from "@/features/decks/presentation/queries/deck-queries";

const emptyMetadata: DeckMetadata = { decks: new Map(), themeSelections: new Map() };

export function useDeckMetadata(deckIds: readonly DeckId[], requireDecks = true) {
  const { data, isPending } = useQuery(deckQueries.metadata(useDecks(), deckIds, requireDecks));

  return { ...(data ?? emptyMetadata), loading: isPending };
}
