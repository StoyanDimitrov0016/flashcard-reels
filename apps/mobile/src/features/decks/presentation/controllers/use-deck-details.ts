import { useQuery } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckQueries, emptyDeckDetails } from "@/features/decks/presentation/queries/deck-queries";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";

/** `enabled` pauses reads while the deck is being deleted. */
export function useDeckDetails(deckId: DeckId | null, enabled = true) {
  const { revision: contentRevision } = useDeckContentRevision();
  const { themeSelectionRevision } = useDeckThemeSelectionRevision();
  const { revision: progressRevision } = useLearningProgressRevision();
  const { data, isPending } = useQuery({
    ...deckQueries.details(useDecks(), deckId, {
      contentRevision,
      themeSelectionRevision,
      progressRevision,
    }),
    enabled,
  });

  return { ...(data ?? emptyDeckDetails), loading: deckId !== null && isPending };
}
