import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";
import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { savedProgressMutations } from "@/features/decks/presentation/mutations/saved-progress-mutations";
import { savedProgressQueries } from "@/features/decks/presentation/queries/saved-progress-queries";
import { showErrorToast, showSuccessToast } from "@/shared/presentation/flashcard-toast";
import { useRefreshOnFocus } from "@/shared/presentation/query/use-refresh-on-focus";

const emptyPaused: readonly PendingDeckProgress[] = [];

type PausedDeckProgressOptions = Readonly<{
  /** While true, a newly paused deck waits before its choice opens, such as during an import. */
  suspendPrompt: boolean;
}>;

/**
 * Decks whose saved progress waits for Continue or Start fresh after a reinstall. Loads them when
 * the screen gains focus, offers each choice once, and resolves the learner's decision.
 */
export function usePausedDeckProgress({ suspendPrompt }: PausedDeckProgressOptions) {
  const services = useDecks();
  const queryClient = useQueryClient();
  const pausedQuery = useQuery(savedProgressQueries.paused(services));
  const resolutionOptions = savedProgressMutations.resolvePaused(services);
  const resolution = useMutation(resolutionOptions);
  const paused = pausedQuery.data ?? emptyPaused;
  const [selected, setSelected] = useState<PendingDeckProgress | null>(null);
  const [confirmingStartFresh, setConfirmingStartFresh] = useState(false);
  const prompted = useRef(new Set<string>());
  const { refetch } = pausedQuery;
  useRefreshOnFocus(refetch);

  let error: string | null = null;
  if (resolution.isError) {
    error = "Could not update saved progress. Try again.";
  } else if (pausedQuery.isError) {
    error = "Could not load saved progress. Try again.";
  }

  useEffect(
    function announceProgressFailure() {
      // While a choice is open, the error shows next to its buttons instead.
      if (error && !selected) {
        showErrorToast(error);
      }
    },
    [error, selected]
  );

  useEffect(
    function offerUnresolvedChoice() {
      if (suspendPrompt || selected) {
        return;
      }
      const unprompted = paused.find((progress) => !prompted.current.has(progress.deckId));
      if (unprompted) {
        prompted.current.add(unprompted.deckId);
        setSelected(unprompted);
      }
    },
    [paused, selected, suspendPrompt]
  );

  const resolve = (startFresh: boolean) => {
    // The mutation cache knows synchronously about a decision made by a tap this same frame.
    if (!selected || queryClient.isMutating(resolutionOptions) > 0) {
      return;
    }
    resolution.mutate(
      { deckId: selected.deckId, startFresh },
      {
        onSuccess: () => {
          setSelected(null);
          setConfirmingStartFresh(false);
          showSuccessToast(
            startFresh ? "Starting fresh with this deck." : "Saved progress continued."
          );
        },
        onError: () => setConfirmingStartFresh(false),
      }
    );
  };

  return {
    paused,
    selected,
    confirmingStartFresh,
    busy: resolution.isPending,
    error,
    isPaused: (deckId: DeckId) => paused.some((progress) => progress.deckId === deckId),
    open: (deckId: DeckId) => {
      const progress = paused.find((candidate) => candidate.deckId === deckId);
      if (progress) {
        resolution.reset();
        setSelected(progress);
      }
    },
    close: () => {
      if (!confirmingStartFresh) {
        setSelected(null);
      }
    },
    askToStartFresh: () => setConfirmingStartFresh(true),
    cancelStartFresh: () => setConfirmingStartFresh(false),
    continueProgress: () => resolve(false),
    startFresh: () => resolve(true),
  };
}
