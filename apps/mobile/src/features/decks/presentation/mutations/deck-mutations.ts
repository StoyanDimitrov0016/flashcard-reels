import { mutationOptions } from "@tanstack/react-query";

import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";
import type { DeckInstallResult } from "@/features/decks/deck-installer";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DecksCapability } from "@/features/decks/presentation/dependencies/use-decks";

import {
  DeckThemeSelection,
  type DeckThemeId,
} from "@/features/decks/domain/deck-theme-selection.model";
import { shouldInvalidateDeckContent } from "@/features/decks/presentation/deck-content-invalidation";
import { toOperationError } from "@/shared/errors/normalize-error";
import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

export type DeckImport = Readonly<{
  /** Picks or downloads the package; resolves null when the learner cancels. */
  select: () => Promise<DeckPackageSelection | null>;
  /** Releases a temporary package file after installation, whatever the outcome. */
  release?: (selection: DeckPackageSelection) => void;
}>;

async function importDeck(
  services: Pick<DecksCapability, "deckInstaller">,
  { select, release }: DeckImport
): Promise<DeckInstallResult | null> {
  const selection = await select();
  if (!selection) {
    return null;
  }
  try {
    return await services.deckInstaller.installFromFile(selection);
  } finally {
    release?.(selection);
  }
}

/**
 * Deck writes. Each invalidates the reads it changes (see query-scopes) and finishes without
 * waiting for them to refetch, unless the screen must not move on before they do. Failures are
 * normalized here so every screen shows the same feedback.
 */
export const deckMutations = {
  remove: (services: Pick<DecksCapability, "deckService">) =>
    mutationOptions({
      mutationKey: ["decks", "remove"],
      mutationFn: async (deckId: DeckId) => {
        try {
          await services.deckService.remove(deckId);
        } catch (cause) {
          throw toOperationError(cause, {
            code: "DECK_OPERATION_FAILED",
            context: { deckId, operation: "deck-delete" },
            message: "Could not delete deck",
          });
        }
      },
      onSuccess: (_result, _deckId, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["deck-content", "learning-progress"]);
      },
      meta: { errorReport: "Deck delete failure" },
    }),
  saveTheme: (services: Pick<DecksCapability, "deckService">) =>
    mutationOptions({
      mutationKey: ["decks", "save-theme"],
      mutationFn: async ({ deckId, theme }: Readonly<{ deckId: DeckId; theme: DeckThemeId }>) => {
        try {
          await services.deckService.saveThemeSelection(new DeckThemeSelection({ deckId, theme }));
        } catch (cause) {
          throw toOperationError(cause, {
            code: "DECK_OPERATION_FAILED",
            context: { deckId, operation: "deck-theme-selection-save" },
            message: "Could not save this theme",
          });
        }
      },
      // Waiting for the reload keeps the save pending until screens show the new theme.
      onSuccess: (_result, _selection, _onMutateResult, { client }) =>
        invalidateChangedData(client, ["theme-selection"]),
      meta: { errorReport: "Deck theme selection save failure" },
    }),
  import: (services: Pick<DecksCapability, "deckInstaller">) =>
    mutationOptions({
      mutationKey: ["decks", "import"],
      mutationFn: async (deckImport: DeckImport) => {
        try {
          return await importDeck(services, deckImport);
        } catch (cause) {
          throw toOperationError(cause, {
            code: "DECK_OPERATION_FAILED",
            context: { operation: "deck-import" },
            message: "Could not import deck package",
          });
        }
      },
      onSuccess: (result, _deckImport, _onMutateResult, { client }) => {
        if (result && shouldInvalidateDeckContent(result)) {
          void invalidateChangedData(client, ["deck-content"]);
        }
      },
      meta: { errorReport: "Deck import failure" },
    }),
};
