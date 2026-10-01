import { useCallback } from "react";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";

import { DeckIdSchema } from "@/features/decks/contracts/deck.schema";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { OperationError } from "@/shared/errors/operation-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
const emptyMetadata = {
  decks: new Map<DeckId, Deck>(),
  themeSelections: new Map<DeckId, DeckThemeSelection>(),
};
function metadataFailure(error: unknown) {
  return toOperationError(error, {
    code: "VIEW_LOAD_FAILED",
    context: { operation: "decks.load" },
    message: "Could not load decks",
  });
}
export function useDeckMetadata(deckIds: readonly DeckId[], requireDecks = true) {
  const { deckService } = useDecks();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const key = deckIds.join(",");
  const load = useCallback(
    async (_theme = themeSelectionRevision) => {
      const ids = key ? key.split(",").map((id) => DeckIdSchema.parse(id)) : [];
      const entries = await deckService.findWithThemes(ids);
      const decks = new Map(
        entries.flatMap((entry) => (entry.deck ? [[entry.deck.id, entry.deck] as const] : []))
      );
      const themeSelections = new Map<DeckId, DeckThemeSelection>();
      for (const id of ids) {
        if (requireDecks && !decks.has(id)) {
          throw new OperationError({
            code: "DECK_NOT_FOUND",
            context: { deckId: id, operation: "decks.load" },
            message: "Missing deck " + id,
          });
        }
        const theme = entries.find((entry) => entry.deckId === id)?.themeSelection;
        if (!theme) {
          throw new OperationError({
            code: "VIEW_LOAD_FAILED",
            context: { deckId: id, operation: "deck-theme-selections.load" },
            message: "Missing theme selection for deck " + id,
          });
        }
        themeSelections.set(id, theme);
      }
      return { decks, themeSelections };
    },
    [key, deckService, themeSelectionRevision, requireDecks]
  );
  const state = useAsyncLoad({ load, initialData: emptyMetadata, onError: metadataFailure });
  if (state.error) {
    throw state.error;
  }

  return { ...state.data, error: state.error, loading: state.loading };
}
