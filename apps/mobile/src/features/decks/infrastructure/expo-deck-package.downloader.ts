import { File, Paths } from "expo-file-system";

import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackageSelection } from "@/features/decks/application/deck-package-picker";

export class ExpoDeckPackageDownloader implements DeckPackageDownloader {
  async download(url: string): Promise<DeckPackageSelection> {
    const destination = new File(Paths.cache, `deck-import-${Date.now()}.fcrdeck`);
    const file = await File.downloadFileAsync(url, destination);
    return { uri: file.uri };
  }

  remove(selection: DeckPackageSelection): void {
    const file = new File(selection.uri);
    if (file.exists) {
      file.delete();
    }
  }
}
