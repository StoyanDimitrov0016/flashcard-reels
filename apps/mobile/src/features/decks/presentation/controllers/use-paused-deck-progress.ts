import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";
import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { savedProgressQueries } from "@/features/decks/presentation/queries/saved-progress-queries";
import { reportError } from "@/shared/errors/report-error";
import { showErrorToast, showSuccessToast } from "@/shared/presentation/flashcard-toast";
import { useSingleFlight } from "@/shared/presentation/hooks/use-single-flight";
import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";
import { useRefreshOnFocus } from "@/shared/presentation/query/use-refresh-on-focus";

const emptyPaused: readonly PendingDeckProgress[] = [];
const loadFailure = "Could not load saved progress. Try again.";

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
  const { savedProgressService } = services;
  const queryClient = useQueryClient();
  const pausedQuery = useQuery(savedProgressQueries.paused(services));
  const paused = pausedQuery.data ?? emptyPaused;
  const [selected, setSelected] = useState<PendingDeckProgress | null>(null);
  const [confirmingStartFresh, setConfirmingStartFresh] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const error = resolutionError ?? (pausedQuery.isError ? loadFailure : null);
  const prompted = useRef(new Set<string>());
  const { refetch } = pausedQuery;
  useRefreshOnFocus(refetch);

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

  const resolution = useSingleFlight(async (signal, startFresh: boolean): Promise<void> => {
    if (!selected) {
      return;
    }
    setResolutionError(null);
    try {
      if (startFresh) {
        await savedProgressService.deleteProgress(selected.deckId);
      } else {
        await savedProgressService.continueProgress(selected.deckId);
      }
      void invalidateChangedData(queryClient, ["deck-content", "learning-progress"]);
      if (signal.aborted) {
        return;
      }
      setSelected(null);
      setConfirmingStartFresh(false);
      showSuccessToast(startFresh ? "Starting fresh with this deck." : "Saved progress continued.");
    } catch (cause) {
      reportError(cause, "Paused progress resolution failure");
      setResolutionError("Could not update saved progress. Try again.");
      setConfirmingStartFresh(false);
    }
  });

  return {
    paused,
    selected,
    confirmingStartFresh,
    busy: resolution.busy,
    error,
    refresh: () => void refetch(),
    isPaused: (deckId: DeckId) => paused.some((progress) => progress.deckId === deckId),
    open: (deckId: DeckId) => {
      const progress = paused.find((candidate) => candidate.deckId === deckId);
      if (progress) {
        setResolutionError(null);
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
    continueProgress: () => void resolution.run(false),
    startFresh: () => void resolution.run(true),
  };
}
