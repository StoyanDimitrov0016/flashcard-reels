import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries, type DeckMetadata } from "@/features/decks/presentation/queries/deck-queries";
import { toOperationError } from "@/shared/errors/normalize-error";

const emptyMetadata: DeckMetadata = { decks: new Map(), themeSelections: new Map() };

export function useDeckMetadata(deckIds: readonly DeckId[], requireDecks = true) {
  const { deckService } = useDecks();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const { data, error, isPending } = useQuery(
    deckQueries.metadata({ deckService, deckIds, requireDecks, themeSelectionRevision })
  );
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { operation: "decks.load" },
      message: "Could not load decks",
    });
  }

  return { ...(data ?? emptyMetadata), error: null, loading: isPending };
}
