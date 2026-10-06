import { queryOptions } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardsCapability } from "@/features/flashcards/presentation/dependencies/use-flashcards";

import { loadViewData } from "@/shared/presentation/query/load-view-data";

/** Flashcard reads. `services` are stable dependencies; every other input is part of the key. */
export const flashcardQueries = {
  /** A null deck lists every installed card. */
  list: (services: FlashcardsCapability, deckId: DeckId | null, contentRevision: number) =>
    queryOptions({
      queryKey: ["flashcards", "list", deckId, contentRevision],
      queryFn: () =>
        loadViewData(
          {
            operation: "flashcards.load",
            message: "Could not load flashcards",
            context: { deckId },
          },
          () =>
            deckId
              ? services.flashcardService.listByDeckId(deckId)
              : services.flashcardService.list()
        ),
    }),
};
