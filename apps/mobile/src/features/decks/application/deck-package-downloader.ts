import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";

export interface DeckPackageDownloader {
  download(url: string, signal?: AbortSignal): Promise<DeckPackageSelection>;
  remove(selection: DeckPackageSelection): void;
}
