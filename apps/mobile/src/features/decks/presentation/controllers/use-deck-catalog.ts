import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import type { DeckCatalogEntry } from "@/features/decks/domain/deck.service";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries } from "@/features/decks/presentation/queries/deck-queries";

const emptyEntries: DeckCatalogEntry[] = [];

export function useDeckCatalog() {
  const { revision: contentRevision } = useDeckContentRevision();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const { data, isPending, refetch } = useQuery(
    deckQueries.catalog(useDecks(), { contentRevision, themeSelectionRevision })
  );
  // Screens refresh from focus effects, so this must keep one identity across renders.
  const refresh = useCallback(() => void refetch(), [refetch]);

  return { entries: data ?? emptyEntries, loading: isPending, refresh };
}
