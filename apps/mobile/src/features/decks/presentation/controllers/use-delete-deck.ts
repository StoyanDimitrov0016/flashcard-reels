import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";
import { useSingleFlight } from "@/shared/presentation/hooks/use-single-flight";
import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

type DeleteDeckState = Readonly<{ deleting: boolean; error: Error | null }>;

export function useDeleteDeck(): DeleteDeckState & {
  deleteDeck: (deckId: DeckId) => Promise<boolean>;
  clearDeleteError: () => void;
} {
  const { deckService } = useDecks();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const flight = useSingleFlight(async (signal, deckId: DeckId): Promise<boolean> => {
    setError(null);
    try {
      await deckService.remove(deckId);
      void invalidateChangedData(queryClient, ["deck-content", "learning-progress"]);
      // The caller navigates on success, which only makes sense while its screen exists.
      return !signal.aborted;
    } catch (cause) {
      const normalized = toOperationError(cause, {
        code: "DECK_OPERATION_FAILED",
        context: { deckId, operation: "deck-delete" },
        message: "Could not delete deck",
      });
      reportError(normalized, "Deck delete failure");
      setError(normalized);
      return false;
    }
  });

  return {
    clearDeleteError: () => setError(null),
    deleteDeck: async (deckId) => (await flight.run(deckId)) ?? false,
    deleting: flight.busy,
    error,
  };
}
