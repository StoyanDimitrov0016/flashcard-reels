import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { FlashcardProgressCapability } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import {
  explainFlashcardProgress,
  type FlashcardProgressExplanation,
} from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { loadViewData } from "@/shared/presentation/query/load-view-data";

export type FlashcardProgressListRow = Readonly<{
  card: Flashcard;
  deck: Deck;
  explanation: FlashcardProgressExplanation;
  progress: FlashcardProgress | null;
}>;

async function loadProgressList({
  deckService,
  flashcardService,
  flashcardProgressService,
}: FlashcardProgressCapability): Promise<FlashcardProgressListRow[]> {
  const cards = await flashcardService.list();
  const progressByCardId = await flashcardProgressService.findByFlashcardIds(
    cards.map((card) => card.id)
  );
  const entries = await deckService.findWithThemes([...new Set(cards.map((card) => card.deckId))]);
  const decksById = new Map(
    entries.flatMap((entry) => (entry.deck ? [[entry.deck.id, entry.deck] as const] : []))
  );
  return cards.flatMap((card) => {
    const deck = decksById.get(card.deckId);
    if (!deck) {
      return [];
    }
    const progress = progressByCardId.get(card.id) ?? null;
    return [{ card, deck, explanation: explainFlashcardProgress(progress), progress }];
  });
}

/** Learning progress reads. `services` are stable dependencies; other inputs are in the key. */
export const flashcardProgressQueries = {
  list: (services: FlashcardProgressCapability, progressRevision: number) =>
    queryOptions({
      queryKey: ["learning-progress", "list", progressRevision],
      queryFn: () =>
        loadViewData(
          { operation: "flashcard-progress-list.load", message: "Could not load progress" },
          () => loadProgressList(services)
        ),
      placeholderData: keepPreviousData,
    }),
};
