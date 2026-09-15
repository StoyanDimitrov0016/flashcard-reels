import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";

export interface DeckPackageDownloader {
  download(url: string): Promise<DeckPackageSelection>;
  remove(selection: DeckPackageSelection): void;
}
