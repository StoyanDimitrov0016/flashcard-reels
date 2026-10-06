import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useFlashcardsCapability } from "@/features/flashcards/presentation/dependencies/use-flashcards";
import { flashcardQueries } from "@/features/flashcards/presentation/queries/flashcard-queries";

const emptyCards: Flashcard[] = [];

export function useFlashcards(deckId: DeckId | null) {
  const { revision } = useDeckContentRevision();
  const { data, isPending } = useQuery(
    flashcardQueries.list(useFlashcardsCapability(), deckId, revision)
  );

  return { cards: data ?? emptyCards, loading: isPending };
}
