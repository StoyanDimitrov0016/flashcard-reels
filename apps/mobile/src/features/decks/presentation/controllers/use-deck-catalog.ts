import { useQuery } from "@tanstack/react-query";

import type { DeckCatalogEntry } from "@/features/decks/domain/deck.service";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries } from "@/features/decks/presentation/queries/deck-queries";

const emptyEntries: DeckCatalogEntry[] = [];

export function useDeckCatalog() {
  const { data, isPending } = useQuery(deckQueries.catalog(useDecks()));

  return { entries: data ?? emptyEntries, loading: isPending };
}
