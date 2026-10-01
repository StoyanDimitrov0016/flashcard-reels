import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";
import type { DeckId } from "@/features/decks/domain/deck.model";

import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { reportError } from "@/shared/errors/report-error";
import { showErrorToast, showSuccessToast } from "@/shared/presentation/flashcard-toast";

type PausedDeckProgressOptions = Readonly<{
  /** While true, a newly paused deck waits before its choice opens, such as during an import. */
  suspendPrompt: boolean;
}>;

/**
 * Decks whose saved progress waits for Continue or Start fresh after a reinstall. Loads them when
 * the screen gains focus, offers each choice once, and resolves the learner's decision.
 */
export function usePausedDeckProgress({ suspendPrompt }: PausedDeckProgressOptions) {
  const { savedProgressService } = useDecks();
  const invalidateDeckContent = useInvalidateDeckContent();
  const { invalidateLearningProgress } = useLearningProgressRevision();
  const [paused, setPaused] = useState<PendingDeckProgress[]>([]);
  const [selected, setSelected] = useState<PendingDeckProgress | null>(null);
  const [confirmingStartFresh, setConfirmingStartFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompted = useRef(new Set<string>());
  const loadSequence = useRef(0);

  const refresh = useCallback(() => {
    const sequence = ++loadSequence.current;
    void savedProgressService
      .listPendingProgress()
      .then((progress) => {
        if (sequence === loadSequence.current) {
          setPaused(progress);
        }
      })
      .catch((cause: unknown) => {
        reportError(cause, "Paused progress load failure");
        if (sequence === loadSequence.current) {
          setError("Could not load saved progress. Try again.");
        }
      });
  }, [savedProgressService]);

  useFocusEffect(
    useCallback(
      function refreshPausedProgressWhenFocused() {
        refresh();
        return function cancelPausedProgressLoad() {
          loadSequence.current += 1;
        };
      },
      [refresh]
    )
  );

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

  const resolve = async (startFresh: boolean) => {
    if (!selected || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (startFresh) {
        await savedProgressService.deleteProgress(selected.deckId);
      } else {
        await savedProgressService.continueProgress(selected.deckId);
      }
      invalidateDeckContent();
      invalidateLearningProgress();
      setSelected(null);
      setConfirmingStartFresh(false);
      refresh();
      showSuccessToast(startFresh ? "Starting fresh with this deck." : "Saved progress continued.");
    } catch (cause) {
      reportError(cause, "Paused progress resolution failure");
      setError("Could not update saved progress. Try again.");
      setConfirmingStartFresh(false);
    } finally {
      setBusy(false);
    }
  };

  return {
    paused,
    selected,
    confirmingStartFresh,
    busy,
    error,
    refresh,
    isPaused: (deckId: DeckId) => paused.some((progress) => progress.deckId === deckId),
    open: (deckId: DeckId) => {
      const progress = paused.find((candidate) => candidate.deckId === deckId);
      if (progress) {
        setError(null);
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
    continueProgress: () => void resolve(false),
    startFresh: () => void resolve(true),
  };
}
