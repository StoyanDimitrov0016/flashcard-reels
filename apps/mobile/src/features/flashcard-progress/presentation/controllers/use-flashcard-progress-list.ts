import { useCallback } from "react";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import {
  explainFlashcardProgress,
  type FlashcardProgressExplanation,
} from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";

type FlashcardProgressListRow = Readonly<{
  card: Flashcard;
  deck: Deck;
  explanation: FlashcardProgressExplanation;
  progress: FlashcardProgress | null;
}>;

type FlashcardProgressListState = Readonly<{
  error: Error | null;
  loading: boolean;
  rows: FlashcardProgressListRow[];
}>;

const emptyRows: FlashcardProgressListRow[] = [];
function progressFailure(error: unknown) {
  return toOperationError(error, {
    code: "VIEW_LOAD_FAILED",
    context: { operation: "flashcard-progress-list.load" },
    message: "Could not load progress",
  });
}

export function useFlashcardProgressList(): FlashcardProgressListState & {
  refresh: () => void;
} {
  const { deckService, flashcardService, flashcardProgressService } = useFlashcardProgress();
  const { revision: progressRevision } = useLearningProgressRevision();
  const load = useCallback(
    async (_revision = progressRevision) => {
      const cards = await flashcardService.list();
      const progressByCardId = await flashcardProgressService.findByFlashcardIds(
        cards.map((card) => card.id)
      );
      const entries = await deckService.findWithThemes([
        ...new Set(cards.map((card) => card.deckId)),
      ]);
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
    },
    [deckService, flashcardService, flashcardProgressService, progressRevision]
  );
  const state = useAsyncLoad({ load, initialData: emptyRows, onError: progressFailure });
  if (state.error) {
    throw state.error;
  }
  return {
    rows: state.data,
    error: state.error,
    loading: state.loading,
    refresh: () => state.refresh(),
  };
}
