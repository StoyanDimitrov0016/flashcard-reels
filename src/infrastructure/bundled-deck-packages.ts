import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import type { DeckCoverAsset, DeckId } from "@/features/decks/domain/deck.model";

import javascriptPackage from "../../assets/decks/4e4c5ba0-51d0-4619-9c88-920e6ff12d6e.fcrdeck";
import reactPackage from "../../assets/decks/06bd0ca5-587e-4854-92f8-ad972b72f0ed.fcrdeck";
import systemDesignPackage from "../../assets/decks/40bf0d86-f860-478c-83b8-e490fed65a5e.fcrdeck";
import databasesPackage from "../../assets/decks/b66fad55-88ba-4047-986b-15e4ff7a3053.fcrdeck";
import computerSciencePackage from "../../assets/decks/ed10310f-6d24-4c52-b5c7-bc98081e1606.fcrdeck";
import operatingSystemsPackage from "../../assets/decks/27962017-2742-4862-9520-08b0dc1c1c6b.fcrdeck";

export type BundledDeckDefinition = Readonly<{
  id: DeckId;
  version: number;
  asset: number;
  appearance: Readonly<{
    accentColor: string;
    backgroundColor: string;
    coverAsset: DeckCoverAsset;
  }>;
}>;

export const bundledDeckRegistry: Readonly<Record<DeckId, BundledDeckDefinition>> = {
  "4e4c5ba0-51d0-4619-9c88-920e6ff12d6e": {
    id: "4e4c5ba0-51d0-4619-9c88-920e6ff12d6e",
    version: 1,
    asset: javascriptPackage,
    appearance: { accentColor: "#F8C15C", backgroundColor: "#17130D", coverAsset: "javascript" },
  },
  "06bd0ca5-587e-4854-92f8-ad972b72f0ed": {
    id: "06bd0ca5-587e-4854-92f8-ad972b72f0ed",
    version: 1,
    asset: reactPackage,
    appearance: { accentColor: "#61DAFB", backgroundColor: "#0B1720", coverAsset: "react" },
  },
  "40bf0d86-f860-478c-83b8-e490fed65a5e": {
    id: "40bf0d86-f860-478c-83b8-e490fed65a5e",
    version: 1,
    asset: systemDesignPackage,
    appearance: {
      accentColor: "#FF9D66",
      backgroundColor: "#1A100D",
      coverAsset: "system-design",
    },
  },
  "b66fad55-88ba-4047-986b-15e4ff7a3053": {
    id: "b66fad55-88ba-4047-986b-15e4ff7a3053",
    version: 1,
    asset: databasesPackage,
    appearance: { accentColor: "#82E0B0", backgroundColor: "#0D1815", coverAsset: "database" },
  },
  "ed10310f-6d24-4c52-b5c7-bc98081e1606": {
    id: "ed10310f-6d24-4c52-b5c7-bc98081e1606",
    version: 1,
    asset: computerSciencePackage,
    appearance: {
      accentColor: "#B8A5FF",
      backgroundColor: "#131020",
      coverAsset: "computer-science",
    },
  },
  "27962017-2742-4862-9520-08b0dc1c1c6b": {
    id: "27962017-2742-4862-9520-08b0dc1c1c6b",
    version: 1,
    asset: operatingSystemsPackage,
    appearance: {
      accentColor: "#D7A7FF",
      backgroundColor: "#1A1020",
      coverAsset: "operating-systems",
    },
  },
};

export async function readBundledDeckPackage(
  definition: BundledDeckDefinition
): Promise<Uint8Array> {
  const asset = Asset.fromModule(definition.asset);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error(`Bundled deck package ${definition.id} did not resolve to a local file`);
  }
  return new File(asset.localUri).bytes();
}
