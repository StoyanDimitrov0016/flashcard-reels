import { mutationOptions } from "@tanstack/react-query";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardProgressCapability } from "@/features/flashcard-progress/presentation/dependencies/use-flashcard-progress";

import { toOperationError } from "@/shared/errors/normalize-error";
import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

type ProgressServices = Pick<FlashcardProgressCapability, "flashcardProgressService">;

/** Learning-progress resets. Each invalidates every read that shows progress. */
export const learningProgressMutations = {
  resetAll: (services: ProgressServices) =>
    mutationOptions({
      mutationKey: ["learning-progress", "reset-all"],
      mutationFn: async () => {
        try {
          await services.flashcardProgressService.resetAllProgress();
        } catch (cause) {
          throw toOperationError(cause, {
            code: "PROGRESS_RESET_FAILED",
            context: { operation: "learning-progress.reset-all" },
            message: "The learning-progress reset could not be completed",
          });
        }
      },
      onSuccess: (_result, _variables, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["learning-progress"]);
      },
      meta: { errorReport: "Learning progress reset failure" },
    }),
  resetDeck: (services: ProgressServices) =>
    mutationOptions({
      mutationKey: ["learning-progress", "reset-deck"],
      mutationFn: (deckId: DeckId) => services.flashcardProgressService.resetDeckProgress(deckId),
      onSuccess: (_result, _deckId, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["learning-progress"]);
      },
      meta: { errorReport: "Deck progress reset failure" },
    }),
};
