import * as DocumentPicker from "expo-document-picker";

import type {
  DeckPackagePicker,
  DeckPackageSelection,
} from "@/features/decks/application/deck-package-picker";

export class ExpoDeckPackagePicker implements DeckPackagePicker {
  async pick(): Promise<DeckPackageSelection | null> {
    const selection = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });
    if (selection.canceled) {
      return null;
    }
    const asset = selection.assets[0];
    if (!asset) {
      throw new Error("No deck package was selected");
    }
    return { uri: asset.uri };
  }
}
