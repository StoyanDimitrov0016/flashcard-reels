import { File } from "expo-file-system";

import type { DeckPackageFileReader } from "@/features/decks/domain/deck-package.model";

export class ExpoDeckPackageFileReader implements DeckPackageFileReader {
  read(uri: string): Promise<Uint8Array> {
    return new File(uri).bytes();
  }
}
