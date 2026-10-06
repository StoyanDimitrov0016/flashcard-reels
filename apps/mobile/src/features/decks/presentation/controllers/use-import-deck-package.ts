import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { DeckDownloadProgress } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";
import type { DeckInstallResult } from "@/features/decks/deck-installer";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import {
  deckMutations,
  type DeckImport,
} from "@/features/decks/presentation/mutations/deck-mutations";
import { reportError } from "@/shared/errors/report-error";

export type { DeckDownloadProgress };

// Progress events arrive far faster than the bar needs to redraw.
const PROGRESS_INTERVAL_MS = 120;

/**
 * Imports a package picked on the device or downloaded from a QR link. One import runs at a time
 * across the app. A download stops when the learner cancels or the screen unmounts; nothing
 * installs, and no result is published, once the screen that started the import is gone.
 */
export function useImportDeckPackage() {
  const services = useDecks();
  const { deckPackageDownloader, deckPackagePicker } = services;
  const queryClient = useQueryClient();
  const importOptions = deckMutations.import(services);
  const importer = useMutation(importOptions);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DeckDownloadProgress | null>(null);
  const lastProgressAt = useRef(0);
  const download = useRef<AbortController | null>(null);
  const screen = useRef<AbortController | null>(null);

  useEffect(function ownImportLifetime() {
    const controller = new AbortController();
    screen.current = controller;
    return function endImportLifetime() {
      controller.abort();
      download.current?.abort();
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

  const releaseDownload = (selection: DeckPackageSelection) => {
    try {
      deckPackageDownloader.remove(selection);
    } catch (error) {
      // Cache cleanup must not obscure the import result.
      reportError(error, "Deck import cleanup failure");
    }
  };

  /** The mutation cache knows synchronously whether an import is running anywhere. */
  const canImport = () =>
    screen.current !== null &&
    !screen.current.signal.aborted &&
    queryClient.isMutating(importOptions) === 0;

  const runImport = async (deckImport: DeckImport): Promise<DeckInstallResult | null> => {
    const lifetime = screen.current?.signal;
    try {
      const result = await importer.mutateAsync(deckImport);
      return lifetime?.aborted ? null : result;
    } catch {
      // The failure is shown through `error` and reported by the mutation.
      return null;
    }
  };

  const importFromDevice = async () => {
    if (!canImport()) {
      return null;
    }
    return runImport({
      select: async () => {
        const selection = await deckPackagePicker.pick();
        return screen.current?.signal.aborted ? null : selection;
      },
    });
  };

  const importFromUrl = async (url: string) => {
    if (!canImport()) {
      return null;
    }
    // Created before the import starts, so a cancel in the same tick still stops the download.
    const controller = new AbortController();
    download.current = controller;
    setDownloadProgress(null);
    setDownloading(true);
    lastProgressAt.current = 0;
    return runImport({
      select: async () => {
        try {
          // Cancelled or unmounted before the download began.
          if (controller.signal.aborted) {
            return null;
          }
          const selection = await deckPackageDownloader.download(
            url,
            controller.signal,
            reportProgress
          );
          if (controller.signal.aborted || screen.current?.signal.aborted) {
            releaseDownload(selection);
            return null;
          }
          return selection;
        } catch (error) {
          if (controller.signal.aborted) {
            return null;
          }
          throw error;
        } finally {
          if (download.current === controller) {
            download.current = null;
          }
          setDownloading(false);
        }
      },
      release: releaseDownload,
    });
  };

  return {
    error: importer.error,
    importing: importer.isPending,
    downloading,
    downloadProgress,
    importFromDevice,
    importFromUrl,
    cancelDownload: () => download.current?.abort(),
    clearImportError: importer.reset,
  };
}
