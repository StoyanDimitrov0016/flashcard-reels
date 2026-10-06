import { mutationOptions } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DecksCapability } from "@/features/decks/presentation/dependencies/use-decks";

import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

type SavedProgressServices = Pick<DecksCapability, "savedProgressService">;

/** Decisions about progress kept for paused or uninstalled decks. */
export const savedProgressMutations = {
  /** Continues a paused deck's progress, or deletes it to start fresh. */
  resolvePaused: (services: SavedProgressServices) =>
    mutationOptions({
      mutationKey: ["saved-progress", "resolve-paused"],
      mutationFn: ({ deckId, startFresh }: Readonly<{ deckId: DeckId; startFresh: boolean }>) =>
        startFresh
          ? services.savedProgressService.deleteProgress(deckId)
          : services.savedProgressService.continueProgress(deckId),
      onSuccess: (_result, _decision, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["deck-content", "learning-progress"]);
      },
      meta: { errorReport: "Paused progress resolution failure" },
    }),
  deleteArchived: (services: SavedProgressServices) =>
    mutationOptions({
      mutationKey: ["saved-progress", "delete-archived"],
      mutationFn: (deckId: DeckId) => services.savedProgressService.deleteProgress(deckId),
      onSuccess: (_result, _deckId, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["learning-progress"]);
      },
      meta: { errorReport: "Archived progress deletion failure" },
    }),
};
