import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import javascriptPackage from "../../assets/decks/4e4c5ba0-51d0-4619-9c88-920e6ff12d6e.fcrdeck";
import reactPackage from "../../assets/decks/06bd0ca5-587e-4854-92f8-ad972b72f0ed.fcrdeck";
import systemDesignPackage from "../../assets/decks/40bf0d86-f860-478c-83b8-e490fed65a5e.fcrdeck";
import databasesPackage from "../../assets/decks/b66fad55-88ba-4047-986b-15e4ff7a3053.fcrdeck";
import computerSciencePackage from "../../assets/decks/ed10310f-6d24-4c52-b5c7-bc98081e1606.fcrdeck";
import operatingSystemsPackage from "../../assets/decks/27962017-2742-4862-9520-08b0dc1c1c6b.fcrdeck";

export const bundledDeckPackageAssets = [
  javascriptPackage,
  reactPackage,
  systemDesignPackage,
  databasesPackage,
  computerSciencePackage,
  operatingSystemsPackage,
] as const;

export async function readBundledDeckPackage(assetModule: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error("Bundled deck package did not resolve to a local file");
  }
  return new File(asset.localUri).bytes();
}
