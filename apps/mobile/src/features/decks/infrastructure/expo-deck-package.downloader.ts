import { DownloadTask, File, Paths } from "expo-file-system";

import type {
  DeckDownloadProgress,
  DeckPackageDownloader,
} from "@/features/decks/application/deck-package-downloader";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";

import { buildDeckImportFileName } from "@/features/decks/domain/deck-import-file-name";
import { getDeckDownloadErrorCode } from "@/features/decks/infrastructure/deck-download-error";
import { OperationError } from "@/shared/errors/operation-error";
import { reportError } from "@/shared/errors/report-error";

export const DECK_DOWNLOAD_IDLE_TIMEOUT_MS = 60_000;

export class ExpoDeckPackageDownloader implements DeckPackageDownloader {
  async download(
    url: string,
    signal?: AbortSignal,
    onProgress?: (progress: DeckDownloadProgress) => void
  ): Promise<DeckPackageSelection> {
    const destination = new File(Paths.cache, buildDeckImportFileName(Date.now()));
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) {
      controller.abort();
    }
    let timedOut = false;
    const abortStalledDownload = () => {
      timedOut = true;
      controller.abort();
    };
    let timeout = setTimeout(abortStalledDownload, DECK_DOWNLOAD_IDLE_TIMEOUT_MS);
    let receivedBytes = 0;
    let task: DownloadTask | undefined;
    try {
      task = new DownloadTask(url, destination, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (bytesWritten > receivedBytes && !controller.signal.aborted) {
            receivedBytes = bytesWritten;
            clearTimeout(timeout);
            timeout = setTimeout(abortStalledDownload, DECK_DOWNLOAD_IDLE_TIMEOUT_MS);
          }
          onProgress?.({ bytesWritten, totalBytes: totalBytes > 0 ? totalBytes : null });
        },
        signal: controller.signal,
      });
      const file = await task.downloadAsync();
      if (!file || controller.signal.aborted) {
        throw new OperationError({
          code: "DECK_DOWNLOAD_FAILED",
          message: "Deck download was interrupted",
        });
      }
      return { uri: file.uri };
    } catch (cause) {
      try {
        if (destination.exists) {
          destination.delete();
        }
      } catch (cleanupError) {
        reportError(cleanupError, "Interrupted deck download cleanup failure");
      }
      if (signal?.aborted) {
        throw cause;
      }
      throw new OperationError({
        code: timedOut ? "DECK_DOWNLOAD_TIMED_OUT" : getDeckDownloadErrorCode(cause),
        message: timedOut ? "Deck download timed out" : "Deck download failed",
        cause,
        context: { operation: "deck-download" },
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
      try {
        task?.release();
      } catch (cleanupError) {
        reportError(cleanupError, "Deck download task release failure");
      }
    }
  }

  remove(selection: DeckPackageSelection): void {
    const file = new File(selection.uri);
    if (file.exists) {
      file.delete();
    }
  }
}
