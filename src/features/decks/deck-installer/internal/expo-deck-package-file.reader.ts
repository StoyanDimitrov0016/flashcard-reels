import { File } from "expo-file-system";

import type { DeckPackageFile } from "@/features/decks/deck-installer";
import type { DeckPackageFileReader } from "@/features/decks/deck-installer/internal/deck-package.model";

export class ExpoDeckPackageFileReader implements DeckPackageFileReader {
  read(file: DeckPackageFile): Promise<Uint8Array> {
    return new File(file.uri).bytes();
  }
}
