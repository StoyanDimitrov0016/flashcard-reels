import { queryOptions } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

type FlashcardListOptions = Readonly<{
  flashcardService: FlashcardService;
  /** Null lists every installed card. */
  deckId: DeckId | null;
  contentRevision: number;
}>;

/** Flashcard reads. Keys carry the deck content revision until revisions become invalidation. */
export const flashcardQueries = {
  list: ({ flashcardService, deckId, contentRevision }: FlashcardListOptions) =>
    queryOptions({
      queryKey: ["flashcards", "list", deckId, contentRevision],
      queryFn: () => (deckId ? flashcardService.listByDeckId(deckId) : flashcardService.list()),
    }),
};
