import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { ArchivedDeckProgress } from "@/features/decks/domain/archived-deck-progress";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { savedProgressMutations } from "@/features/decks/presentation/mutations/saved-progress-mutations";
import { savedProgressQueries } from "@/features/decks/presentation/queries/saved-progress-queries";
import { showSuccessToast } from "@/shared/presentation/flashcard-toast";
import { useRefreshOnFocus } from "@/shared/presentation/query/use-refresh-on-focus";

const emptyRows: readonly ArchivedDeckProgress[] = [];

export function useArchivedProgress() {
  const services = useDecks();
  const { data, isError, isFetching, refetch } = useQuery(savedProgressQueries.archived(services));
  const deletion = useMutation(savedProgressMutations.deleteArchived(services));
  const [selected, setSelected] = useState<ArchivedDeckProgress | null>(null);
  useRefreshOnFocus(refetch);

  return {
    rows: data ?? emptyRows,
    selected,
    loading: isFetching,
    deleting: deletion.isPending,
    loadError: isError ? "Could not load archived progress." : null,
    deleteError: deletion.isError ? "Could not delete saved progress. Try again." : null,
    refresh: () => void refetch(),
    chooseForDeletion: (row: ArchivedDeckProgress) => {
      deletion.reset();
      setSelected(row);
    },
    cancelDeletion: () => {
      if (!deletion.isPending) {
        setSelected(null);
        deletion.reset();
      }
    },
    deleteSelected: () => {
      if (!selected || deletion.isPending) {
        return;
      }
      deletion.mutate(selected.deckId, {
        onSuccess: () => {
          setSelected(null);
          showSuccessToast("Saved progress deleted.");
        },
      });
    },
  };
}
