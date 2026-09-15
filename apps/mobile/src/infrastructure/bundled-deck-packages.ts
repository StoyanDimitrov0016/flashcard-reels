import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import type { DeckCoverAsset, DeckId } from "@/features/decks/domain/deck.model";
import {
  isDeckAppearancePresetId,
  type DeckAppearancePresetId,
} from "@/features/decks/domain/deck-appearance.model";
import registryMetadata from "@/infrastructure/bundled-deck-registry.json";

// Metro must see a static import for every bundled asset; registry metadata alone cannot
// produce a runtime asset module through a computed path.
import demoPackage from "../../assets/decks/7f6f98a7-a84d-4cc8-b744-3d0b53e3c873.fcrdeck";

export type BundledDeckDefinition = Readonly<{
  id: DeckId;
  version: number;
  asset: number;
  appearance: Readonly<{
    presetId: DeckAppearancePresetId;
    coverAsset: DeckCoverAsset;
  }>;
}>;

const packageAssets: Readonly<Record<string, number>> = {
  "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873.fcrdeck": demoPackage,
};

function isDeckCoverAsset(value: string): value is DeckCoverAsset {
  return [
    "cards",
    "computer-science",
    "database",
    "javascript",
    "operating-systems",
    "react",
    "system-design",
  ].includes(value);
}

export const bundledDeckRegistry: Readonly<Record<DeckId, BundledDeckDefinition>> =
  Object.fromEntries(
    registryMetadata.map((metadata) => {
      const asset = packageAssets[metadata.packageAsset];
      if (asset === undefined) {
        throw new Error(`No runtime asset is registered for ${metadata.packageAsset}`);
      }
      if (!isDeckCoverAsset(metadata.appearance.coverAsset)) {
        throw new Error(`Invalid cover asset ${metadata.appearance.coverAsset}`);
      }
      if (!isDeckAppearancePresetId(metadata.appearance.presetId)) {
        throw new Error(`Invalid deck appearance preset ${metadata.appearance.presetId}`);
      }
      const definition: BundledDeckDefinition = {
        appearance: {
          presetId: metadata.appearance.presetId,
          coverAsset: metadata.appearance.coverAsset,
        },
        asset,
        id: metadata.id,
        version: metadata.version,
      };
      return [definition.id, definition];
    })
  );

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
