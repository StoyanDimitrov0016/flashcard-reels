import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import type { ArchivedDeckProgress } from "@/features/decks/domain/archived-deck-progress";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { reportError } from "@/shared/errors/report-error";
import { showSuccessToast } from "@/shared/presentation/flashcard-toast";

export function useArchivedProgress() {
  const { savedProgressService } = useDecks();
  const [rows, setRows] = useState<ArchivedDeckProgress[]>([]);
  const [selected, setSelected] = useState<ArchivedDeckProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const deleteInFlight = useRef(false);

  const refresh = useCallback(() => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError(null);
    void savedProgressService
      .listArchivedProgress()
      .then((progress) => {
        if (sequence === loadSequence.current) {
          setRows(progress);
        }
      })
      .catch((cause: unknown) => {
        if (sequence === loadSequence.current) {
          reportError(cause, "Archived progress load failure");
          setLoadError("Could not load archived progress.");
        }
      })
      .finally(() => {
        if (sequence === loadSequence.current) {
          setLoading(false);
        }
      });
  }, [savedProgressService]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return function cancelArchivedProgressLoad() {
        loadSequence.current += 1;
      };
    }, [refresh])
  );

  const chooseForDeletion = (row: ArchivedDeckProgress) => {
    setDeleteError(null);
    setSelected(row);
  };

  const cancelDeletion = () => {
    if (!deleteInFlight.current) {
      setSelected(null);
      setDeleteError(null);
    }
  };

  const deleteSelected = async () => {
    if (!selected || deleteInFlight.current) {
      return;
    }
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await savedProgressService.deleteProgress(selected.deckId);
      setRows((current) => current.filter((row) => row.deckId !== selected.deckId));
      setSelected(null);
      showSuccessToast("Saved progress deleted.");
      refresh();
    } catch (cause) {
      reportError(cause, "Archived progress deletion failure");
      setDeleteError("Could not delete saved progress. Try again.");
    } finally {
      deleteInFlight.current = false;
      setDeleting(false);
    }
  };

  return {
    rows,
    selected,
    loading,
    deleting,
    loadError,
    deleteError,
    refresh,
    chooseForDeletion,
    cancelDeletion,
    deleteSelected,
  };
}
