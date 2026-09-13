import { useCallback, useEffect, useState } from "react";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import {
  explainLearnerProfile,
  type LearnerProfileExplanation,
} from "@/features/learner-profile/domain/learner-profile-explanation";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import { useLearningProgressReset } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { useAppServices } from "@/infrastructure/app-services";

type LearnerProgressRow = Readonly<{
  card: Flashcard;
  deck: Deck;
  explanation: LearnerProfileExplanation;
  profile: LearnerProfile | null;
}>;

type LearnerProgressState = Readonly<{
  error: Error | null;
  loading: boolean;
  rows: LearnerProgressRow[];
}>;

const initialState: LearnerProgressState = { error: null, loading: true, rows: [] };

export function useLearnerProgress(): LearnerProgressState & {
  refresh: () => void;
  resetAllProgress: () => Promise<void>;
} {
  const { deckService, flashcardService, learnerProfileService } = useAppServices();
  const { invalidateLearningProgress, revision: resetRevision } = useLearningProgressReset();
  const [state, setState] = useState<LearnerProgressState>(initialState);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    setRevision((current) => current + 1);
  }, []);
  const resetAllProgress = useCallback(async () => {
    await learnerProfileService.resetAllProgress();
    invalidateLearningProgress();
    refresh();
  }, [invalidateLearningProgress, learnerProfileService, refresh]);

  useEffect(
    function loadLearnerProgress() {
      let active = true;

      const loadProgress = async (_revision: number) => {
        try {
          const cards = await flashcardService.list();
          const profiles = await learnerProfileService.findByFlashcardIds(
            cards.map((card) => card.id)
          );
          const decks = await deckService.findByIds([...new Set(cards.map((card) => card.deckId))]);
          const decksById = new Map(decks.map((deck) => [deck.id, deck] as const));
          const rows = cards.flatMap((card) => {
            const deck = decksById.get(card.deckId);
            if (!deck) {
              return [];
            }
            const profile = profiles.get(card.id) ?? null;
            return [{ card, deck, explanation: explainLearnerProfile(profile), profile }];
          });
          if (active) {
            setState({ error: null, loading: false, rows });
          }
        } catch (error) {
          if (active) {
            setState({
              error: error instanceof Error ? error : new Error("Could not load progress"),
              loading: false,
              rows: [],
            });
          }
        }
      };

      void loadProgress(revision);
      return function cancelLearnerProgressLoad() {
        active = false;
      };
    },
    [deckService, flashcardService, learnerProfileService, resetRevision, revision]
  );

  if (state.error) {
    throw state.error;
  }
  return { ...state, refresh, resetAllProgress };
}
