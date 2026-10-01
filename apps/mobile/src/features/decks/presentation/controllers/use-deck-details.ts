import { useCallback } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckDetails } from "@/features/decks/domain/deck.service";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
type DetailsData = DeckDetails & Readonly<{ progress: ReadonlyMap<string, FlashcardProgress> }>;
const emptyDetails: DetailsData = {
  deck: null,
  cards: [],
  themeSelection: null,
  progress: new Map(),
};
export function useDeckDetails(deckId: DeckId | null, enabled = true) {
  const { deckService, flashcardProgressService } = useDecks();
  const { revision } = useDeckContentRevision();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const { revision: progressRevision } = useLearningProgressRevision();
  const load = useCallback(
    async (_content = revision, _theme = themeSelectionRevision, _progress = progressRevision) => {
      if (deckId === null) {
        return emptyDetails;
      }
      const details = await deckService.getDetails(deckId);
      if (!details.deck) {
        return emptyDetails;
      }
      const progress = await flashcardProgressService.findByFlashcardIds(
        details.cards.map((card) => card.id)
      );
      return { ...details, progress };
    },
    [
      deckId,
      deckService,
      flashcardProgressService,
      revision,
      themeSelectionRevision,
      progressRevision,
    ]
  );
  const onError = useCallback(
    (error: unknown) =>
      toOperationError(error, {
        code: "VIEW_LOAD_FAILED",
        context: { deckId, operation: "deck-details.load" },
        message: "Could not load deck cards",
      }),
    [deckId]
  );
  const state = useAsyncLoad({
    load,
    initialData: emptyDetails,
    onError,
    enabled: enabled && deckId !== null,
  });
  if (deckId === null) {
    return { ...emptyDetails, error: null, loading: false };
  }
  if (state.error) {
    throw state.error;
  }

  return { ...state.data, error: state.error, loading: state.loading };
}
