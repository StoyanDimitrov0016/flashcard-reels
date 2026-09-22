import { useCallback, useEffect, useState } from "react";

import type { CardProgress } from "@/features/card-progress/domain/card-progress.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import {
  explainCardProgress,
  type CardProgressExplanation,
} from "@/features/card-progress/domain/card-progress-explanation";
import { useLearningProgressReset } from "@/features/card-progress/presentation/context/learning-progress-reset-context";
import { useCardProgress } from "@/features/card-progress/presentation/dependencies/use-card-progress";
import { toOperationError } from "@/shared/errors/normalize-error";

type CardProgressListRow = Readonly<{
  card: Flashcard;
  deck: Deck;
  explanation: CardProgressExplanation;
  progress: CardProgress | null;
}>;

type CardProgressListState = Readonly<{
  error: Error | null;
  loading: boolean;
  rows: CardProgressListRow[];
}>;

const initialState: CardProgressListState = { error: null, loading: true, rows: [] };

export function useCardProgressList(): CardProgressListState & {
  refresh: () => void;
} {
  const { deckService, flashcardService, cardProgressService } = useCardProgress();
  const { revision: resetRevision } = useLearningProgressReset();
  const [state, setState] = useState<CardProgressListState>(initialState);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    setRevision((current) => current + 1);
  }, []);
  useEffect(
    function loadCardProgressList() {
      let active = true;

      const loadProgress = async (_revision: number) => {
        try {
          const cards = await flashcardService.list();
          const progressByCardId = await cardProgressService.findByFlashcardIds(
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
            return [{ card, deck, explanation: explainCardProgress(progress), progress }];
          });
          if (active) {
            setState({ error: null, loading: false, rows });
          }
        } catch (error) {
          if (active) {
            setState({
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "card-progress-list.load" },
                message: "Could not load progress",
              }),
              loading: false,
              rows: [],
            });
          }
        }
      };

      void loadProgress(revision);
      return function cancelCardProgressListLoad() {
        active = false;
      };
    },
    [deckService, flashcardService, cardProgressService, resetRevision, revision]
  );

  if (state.error) {
    throw state.error;
  }
  return { ...state, refresh };
}
