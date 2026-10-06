import { useEffect, useRef, useState } from "react";

import type { DeckDownloadProgress } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";
import type { DeckInstallResult } from "@/features/decks/deck-installer";

import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { shouldInvalidateDeckContent } from "@/features/decks/presentation/deck-content-invalidation";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";
import { useSingleFlight } from "@/shared/presentation/hooks/use-single-flight";

export type { DeckDownloadProgress };

type ImportState = Readonly<{ error: Error | null; importing: boolean; downloading: boolean }>;

// Progress events arrive far faster than the bar needs to redraw.
const PROGRESS_INTERVAL_MS = 120;

export function useImportDeckPackage(): ImportState & {
  downloadProgress: DeckDownloadProgress | null;
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
  const [downloadProgress, setDownloadProgress] = useState<DeckDownloadProgress | null>(null);
  const lastProgressAt = useRef(0);
  const flight = useSingleFlight(installAction);
  const downloadController = useRef<AbortController | null>(null);

  useEffect(function ownDeckDownloadLifetime() {
    return function cancelDownloadOnUnmount() {
      downloadController.current?.abort();
    };
  }, []);

  const reportProgress = (progress: DeckDownloadProgress) => {
    const now = Date.now();
    const finished = progress.totalBytes !== null && progress.bytesWritten >= progress.totalBytes;
    if (finished || now - lastProgressAt.current >= PROGRESS_INTERVAL_MS) {
      lastProgressAt.current = now;
      setDownloadProgress(progress);
    }
  };

  async function installAction(
    signal: AbortSignal,
    getSelection: (signal?: AbortSignal) => Promise<DeckPackageSelection | null>,
    removeAfterInstall = false
  ): Promise<DeckInstallResult | null> {
    setDownloadProgress(null);
    lastProgressAt.current = 0;
    const controller = removeAfterInstall ? new AbortController() : null;
    downloadController.current = controller;
    setState({ error: null, importing: true, downloading: removeAfterInstall });
    let selection: DeckPackageSelection | null = null;
    try {
      selection = await getSelection(controller?.signal);
      downloadController.current = null;
      // Nothing installs once the screen that started the import is gone.
      if (!selection || controller?.signal.aborted || signal.aborted) {
        setState({ error: null, importing: false, downloading: false });
        return null;
      }
      setState({ error: null, importing: true, downloading: false });
      const result = await deckInstaller.installFromFile(selection);
      if (shouldInvalidateDeckContent(result)) {
        invalidateDeckContent();
      }
      setState({ error: null, importing: false, downloading: false });
      return signal.aborted ? null : result;
    } catch (error) {
      if (controller?.signal.aborted) {
        setState({ error: null, importing: false, downloading: false });
        return null;
      }
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { operation: "deck-import" },
        message: "Could not import deck package",
      });
      reportError(normalized, "Deck import failure");
      setState({ error: normalized, importing: false, downloading: false });
      return null;
    } finally {
      downloadController.current = null;
      if (removeAfterInstall && selection) {
        try {
          deckPackageDownloader.remove(selection);
        } catch (error) {
          // Cache cleanup must not obscure the import result.
          reportError(error, "Deck import cleanup failure");
        }
      }
    }
  }

  const importFromDevice = async () => (await flight.run(() => deckPackagePicker.pick())) ?? null;
  const importFromUrl = async (url: string) =>
    (await flight.run(
      (signal) => deckPackageDownloader.download(url, signal, reportProgress),
      true
    )) ?? null;

  return {
    ...state,
    importing: flight.busy,
    downloadProgress,
    cancelDownload: () => downloadController.current?.abort(),
    clearImportError: () => setState((current) => ({ ...current, error: null })),
    importFromDevice,
    importFromUrl,
  };
}
