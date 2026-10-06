import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import type { DeckCatalogEntry } from "@/features/decks/domain/deck.service";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries } from "@/features/decks/presentation/queries/deck-queries";
import { toOperationError } from "@/shared/errors/normalize-error";

const emptyEntries: DeckCatalogEntry[] = [];

export function useDeckCatalog() {
  const { deckService } = useDecks();
  const { revision: contentRevision } = useDeckContentRevision();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const { data, error, isPending, refetch } = useQuery(
    deckQueries.catalog({ deckService, contentRevision, themeSelectionRevision })
  );
  // Screens refresh from focus effects, so this must keep one identity across renders.
  const refresh = useCallback(() => void refetch(), [refetch]);
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { operation: "deck-catalog.load" },
      message: "Could not load decks",
    });
  }

  return { entries: data ?? emptyEntries, error: null, loading: isPending, refresh };
}
