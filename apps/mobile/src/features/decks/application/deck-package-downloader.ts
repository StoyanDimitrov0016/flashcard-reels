import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";

/** Bytes received so far; `totalBytes` is null when the server did not send a size. */
export type DeckDownloadProgress = Readonly<{ bytesWritten: number; totalBytes: number | null }>;

export interface DeckPackageDownloader {
  download(
    url: string,
    signal?: AbortSignal,
    onProgress?: (progress: DeckDownloadProgress) => void
  ): Promise<DeckPackageSelection>;
  remove(selection: DeckPackageSelection): void;
}
