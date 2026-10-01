import { useCallback, useState } from "react";

import type { DeckCatalogEntry } from "@/features/decks/domain/deck.service";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
const emptyEntries: DeckCatalogEntry[] = [];
function catalogFailure(error: unknown) {
  return toOperationError(error, {
    code: "VIEW_LOAD_FAILED",
    context: { operation: "deck-catalog.load" },
    message: "Could not load decks",
  });
}
export function useDeckCatalog() {
  const { deckService } = useDecks();
  const { revision: contentRevision } = useDeckContentRevision();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const [revision, setRevision] = useState(0);
  const load = useCallback(
    (_content = contentRevision, _theme = themeSelectionRevision, _refresh = revision) =>
      deckService.getCatalog(),
    [deckService, contentRevision, themeSelectionRevision, revision]
  );
  const state = useAsyncLoad({ load, initialData: emptyEntries, onError: catalogFailure });
  if (state.error) {
    throw state.error;
  }

  return {
    entries: state.data,
    error: state.error,
    loading: state.loading,
    refresh: () => setRevision((current) => current + 1),
  };
}
