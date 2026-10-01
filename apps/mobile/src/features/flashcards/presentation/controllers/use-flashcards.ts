import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useFlashcardsCapability } from "@/features/flashcards/presentation/dependencies/use-flashcards";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
const emptyCards: Flashcard[] = [];
export function useFlashcards(deckId: DeckId | null) {
  const { flashcardService } = useFlashcardsCapability();
  const { revision } = useDeckContentRevision();
  const load = useCallback(
    (_revision = revision) =>
      deckId ? flashcardService.listByDeckId(deckId) : flashcardService.list(),
    [deckId, flashcardService, revision]
  );
  const onError = useCallback(
    (error: unknown) =>
      toOperationError(error, {
        code: "VIEW_LOAD_FAILED",
        context: { deckId, operation: "flashcards.load" },
        message: "Could not load flashcards",
      }),
    [deckId]
  );
  const state = useAsyncLoad({ load, initialData: emptyCards, onError, gate: true });
  if (state.error) {
    throw state.error;
  }

  return { cards: state.data, error: state.error, loading: state.loading };
}
