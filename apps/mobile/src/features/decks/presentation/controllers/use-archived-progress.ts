import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import type { ArchivedDeckProgress } from "@/features/decks/domain/archived-deck-progress";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { savedProgressQueries } from "@/features/decks/presentation/queries/saved-progress-queries";
import { reportError } from "@/shared/errors/report-error";
import { showSuccessToast } from "@/shared/presentation/flashcard-toast";
import { queryScopes } from "@/shared/presentation/query/query-scopes";
import { useRefreshOnFocus } from "@/shared/presentation/query/use-refresh-on-focus";

const emptyRows: readonly ArchivedDeckProgress[] = [];

export function useArchivedProgress() {
  const services = useDecks();
  const { savedProgressService } = services;
  const queryClient = useQueryClient();
  const { data, isError, isFetching, refetch } = useQuery(savedProgressQueries.archived(services));
  const rows = data ?? emptyRows;
  const [selected, setSelected] = useState<ArchivedDeckProgress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteInFlight = useRef(false);
  useRefreshOnFocus(refetch);

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
      setSelected(null);
      showSuccessToast("Saved progress deleted.");
      void queryClient.invalidateQueries({ queryKey: queryScopes.savedProgress });
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
    loading: isFetching,
    deleting,
    loadError: isError ? "Could not load archived progress." : null,
    deleteError,
    refresh: () => void refetch(),
    chooseForDeletion,
    cancelDeletion,
    deleteSelected,
  };
}
