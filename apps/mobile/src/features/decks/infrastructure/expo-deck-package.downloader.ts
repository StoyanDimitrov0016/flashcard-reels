import { DownloadTask, File, Paths } from "expo-file-system";
import { OperationError } from "@/shared/errors/operation-error";
import { reportError } from "@/shared/errors/report-error";

import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";

export const DECK_DOWNLOAD_TIMEOUT_MS = 60_000;

export class ExpoDeckPackageDownloader implements DeckPackageDownloader {
  async download(url: string, signal?: AbortSignal): Promise<DeckPackageSelection> {
    const destination = new File(Paths.cache, `deck-import-${Date.now()}.fcrdeck`);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) {
      controller.abort();
    }
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, DECK_DOWNLOAD_TIMEOUT_MS);
    let task: DownloadTask | undefined;
    try {
      task = new DownloadTask(url, destination, { signal: controller.signal });
      const file = await task.downloadAsync();
      if (!file || controller.signal.aborted) {
        throw new Error("Deck download was interrupted");
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
        code: timedOut ? "DECK_DOWNLOAD_TIMED_OUT" : "DECK_DOWNLOAD_FAILED",
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
