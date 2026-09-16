import { useState } from "react";

import type { DeckInstallResult } from "@/features/decks/deck-installer";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";
import { shouldInvalidateDeckContent } from "@/features/decks/presentation/deck-content-invalidation";
import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useAppServices } from "@/infrastructure/app-services";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/presentation/errors/report-error";

type ImportState = Readonly<{ error: Error | null; importing: boolean }>;

export function useImportDeckPackage(): ImportState & {
  importFromDevice: () => Promise<DeckInstallResult | null>;
  importFromUrl: (url: string) => Promise<DeckInstallResult | null>;
} {
  const { deckInstaller, deckPackageDownloader, deckPackagePicker } = useAppServices();
  const invalidateDeckContent = useInvalidateDeckContent();
  const [state, setState] = useState<ImportState>({ error: null, importing: false });

  const install = async (
    getSelection: () => Promise<DeckPackageSelection | null>,
    removeAfterInstall = false
  ): Promise<DeckInstallResult | null> => {
    setState({ error: null, importing: true });
    let selection: DeckPackageSelection | null = null;
    try {
      selection = await getSelection();
      if (!selection) {
        setState({ error: null, importing: false });
        return null;
      }
      const result = await deckInstaller.installFromFile(selection);
      if (shouldInvalidateDeckContent(result)) {
        invalidateDeckContent();
      }
      setState({ error: null, importing: false });
      return result;
    } catch (error) {
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { operation: "deck-import" },
        message: "Could not import deck package",
      });
      reportError(normalized, "Deck import failure");
      setState({ error: normalized, importing: false });
      return null;
    } finally {
      if (removeAfterInstall && selection) {
        try {
          deckPackageDownloader.remove(selection);
        } catch (error) {
          // Cache cleanup must not obscure the import result.
          reportError(error, "Deck import cleanup failure");
        }
      }
    }
  };

  const importFromDevice = () => install(() => deckPackagePicker.pick());
  const importFromUrl = (url: string) => install(() => deckPackageDownloader.download(url), true);

  return { ...state, importFromDevice, importFromUrl };
}
