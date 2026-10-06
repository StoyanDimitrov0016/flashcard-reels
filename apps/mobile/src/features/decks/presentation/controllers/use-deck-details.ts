import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries, emptyDeckDetails } from "@/features/decks/presentation/queries/deck-queries";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { toOperationError } from "@/shared/errors/normalize-error";

export function useDeckDetails(deckId: DeckId | null, enabled = true) {
  const { deckService, flashcardProgressService } = useDecks();
  const { revision: contentRevision } = useDeckContentRevision();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const { revision: progressRevision } = useLearningProgressRevision();
  const { data, error, isPending } = useQuery(
    deckQueries.details({
      deckService,
      flashcardProgressService,
      deckId,
      enabled,
      contentRevision,
      themeSelectionRevision,
      progressRevision,
    })
  );
  if (deckId === null) {
    return { ...emptyDeckDetails, error: null, loading: false };
  }
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { deckId, operation: "deck-details.load" },
      message: "Could not load deck cards",
    });
  }

  return { ...(data ?? emptyDeckDetails), error: null, loading: isPending };
}
