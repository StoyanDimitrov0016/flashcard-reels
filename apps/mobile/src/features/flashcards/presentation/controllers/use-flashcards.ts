import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useFlashcardsCapability } from "@/features/flashcards/presentation/dependencies/use-flashcards";
import { flashcardQueries } from "@/features/flashcards/presentation/queries/flashcard-queries";
import { toOperationError } from "@/shared/errors/normalize-error";

const emptyCards: Flashcard[] = [];

export function useFlashcards(deckId: DeckId | null) {
  const { flashcardService } = useFlashcardsCapability();
  const { revision } = useDeckContentRevision();
  const { data, error, isPending } = useQuery(
    flashcardQueries.list({ flashcardService, deckId, contentRevision: revision })
  );
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { deckId, operation: "flashcards.load" },
      message: "Could not load flashcards",
    });
  }

  return { cards: data ?? emptyCards, error: null, loading: isPending };
}
