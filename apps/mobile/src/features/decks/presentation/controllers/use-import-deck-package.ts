import { useEffect, useRef, useState } from "react";

import type { DeckInstallResult } from "@/features/decks/deck-installer";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";
import { shouldInvalidateDeckContent } from "@/features/decks/presentation/deck-content-invalidation";
import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

type ImportState = Readonly<{ error: Error | null; importing: boolean; downloading: boolean }>;

export function useImportDeckPackage(): ImportState & {
  importFromDevice: () => Promise<DeckInstallResult | null>;
  importFromUrl: (url: string) => Promise<DeckInstallResult | null>;
  cancelDownload: () => void;
  clearImportError: () => void;
} {
  const { deckInstaller, deckPackageDownloader, deckPackagePicker } = useDecks();
  const invalidateDeckContent = useInvalidateDeckContent();
  const [state, setState] = useState<ImportState>({
    error: null,
    importing: false,
    downloading: false,
  });
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const downloadController = useRef<AbortController | null>(null);

  useEffect(function ownDeckDownloadLifetime() {
    mounted.current = true;
    return function cancelDownloadOnUnmount() {
      mounted.current = false;
      downloadController.current?.abort();
    };
  }, []);

  const updateImportState = (next: ImportState) => {
    if (mounted.current) {
      setState(next);
    }
  };

  const install = async (
    getSelection: (signal?: AbortSignal) => Promise<DeckPackageSelection | null>,
    removeAfterInstall = false
  ): Promise<DeckInstallResult | null> => {
    if (inFlight.current || !mounted.current) {
      return null;
    }
    inFlight.current = true;
    const controller = removeAfterInstall ? new AbortController() : null;
    downloadController.current = controller;
    updateImportState({ error: null, importing: true, downloading: removeAfterInstall });
    let selection: DeckPackageSelection | null = null;
    try {
      selection = await getSelection(controller?.signal);
      downloadController.current = null;
      if (!selection || controller?.signal.aborted || !mounted.current) {
        updateImportState({ error: null, importing: false, downloading: false });
        return null;
      }
      updateImportState({ error: null, importing: true, downloading: false });
      const result = await deckInstaller.installFromFile(selection);
      if (shouldInvalidateDeckContent(result)) {
        invalidateDeckContent();
      }
      updateImportState({ error: null, importing: false, downloading: false });
      return mounted.current ? result : null;
    } catch (error) {
      if (controller?.signal.aborted) {
        updateImportState({ error: null, importing: false, downloading: false });
        return null;
      }
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { operation: "deck-import" },
        message: "Could not import deck package",
      });
      reportError(normalized, "Deck import failure");
      updateImportState({ error: normalized, importing: false, downloading: false });
      return null;
    } finally {
      downloadController.current = null;
      inFlight.current = false;
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
  const importFromUrl = (url: string) =>
    install((signal) => deckPackageDownloader.download(url, signal), true);

  return {
    ...state,
    cancelDownload: () => downloadController.current?.abort(),
    clearImportError: () => {
      if (mounted.current) {
        setState((current) => ({ ...current, error: null }));
      }
    },
    importFromDevice,
    importFromUrl,
  };
}
