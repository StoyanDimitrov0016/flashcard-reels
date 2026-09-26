import { useCallback, useEffect, useState } from "react";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import {
  explainFlashcardProgress,
  type FlashcardProgressExplanation,
} from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { useLearningProgressReset } from "@/features/flashcard-progress/presentation/context/learning-progress-reset-context";
import { useFlashcardProgress } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";
import { toOperationError } from "@/shared/errors/normalize-error";

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

const initialState: FlashcardProgressListState = { error: null, loading: true, rows: [] };

export function useFlashcardProgressList(): FlashcardProgressListState & {
  refresh: () => void;
} {
  const { deckService, flashcardService, flashcardProgressService } = useFlashcardProgress();
  const { revision: resetRevision } = useLearningProgressReset();
  const [state, setState] = useState<FlashcardProgressListState>(initialState);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    setRevision((current) => current + 1);
  }, []);
  useEffect(
    function loadFlashcardProgressList() {
      let active = true;

      const loadProgress = async (_revision: number) => {
        try {
          const cards = await flashcardService.list();
          const progressByCardId = await flashcardProgressService.findByFlashcardIds(
            cards.map((card) => card.id)
          );
          const decks = await deckService.findByIds([...new Set(cards.map((card) => card.deckId))]);
          const decksById = new Map(decks.map((deck) => [deck.id, deck] as const));
          const rows = cards.flatMap((card) => {
            const deck = decksById.get(card.deckId);
            if (!deck) {
              return [];
            }
            const progress = progressByCardId.get(card.id) ?? null;
            return [{ card, deck, explanation: explainFlashcardProgress(progress), progress }];
          });
          if (active) {
            setState({ error: null, loading: false, rows });
          }
        } catch (error) {
          if (active) {
            setState({
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "flashcard-progress-list.load" },
                message: "Could not load progress",
              }),
              loading: false,
              rows: [],
            });
          }
        }
      };

      void loadProgress(revision);
      return function cancelFlashcardProgressListLoad() {
        active = false;
      };
    },
    [deckService, flashcardService, flashcardProgressService, resetRevision, revision]
  );

  if (state.error) {
    throw state.error;
  }
  return { ...state, refresh };
}
