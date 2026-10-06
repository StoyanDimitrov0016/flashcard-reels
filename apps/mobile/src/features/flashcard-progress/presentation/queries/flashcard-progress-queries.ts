import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

import {
  explainFlashcardProgress,
  type FlashcardProgressExplanation,
} from "@/features/flashcard-progress/domain/flashcard-progress-explanation";

export type FlashcardProgressListRow = Readonly<{
  card: Flashcard;
  deck: Deck;
  explanation: FlashcardProgressExplanation;
  progress: FlashcardProgress | null;
}>;

type ProgressListOptions = Readonly<{
  deckService: DeckService;
  flashcardService: FlashcardService;
  flashcardProgressService: FlashcardProgressService;
  progressRevision: number;
}>;

async function loadProgressList({
  deckService,
  flashcardService,
  flashcardProgressService,
}: ProgressListOptions): Promise<FlashcardProgressListRow[]> {
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

/** Learning progress reads. Keys carry the progress revision until it becomes invalidation. */
export const flashcardProgressQueries = {
  list: (options: ProgressListOptions) =>
    queryOptions({
      queryKey: ["flashcard-progress", "list", options.progressRevision],
      queryFn: () => loadProgressList(options),
      placeholderData: keepPreviousData,
    }),
};
