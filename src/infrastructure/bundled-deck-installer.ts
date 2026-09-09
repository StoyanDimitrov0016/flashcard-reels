// oxlint-disable no-await-in-loop -- Bundled packages share one SQLite transaction boundary and are installed in asset order.
import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { bundledDeckAppearanceData } from "@/features/decks/infrastructure/bundled-deck-appearance";
import {
  bundledDeckPackageAssets,
  readBundledDeckPackage,
} from "@/infrastructure/bundled-deck-packages";
import {
  createDeckPackageServices,
  type AppDatabase,
} from "@/infrastructure/deck-package-services";
import type { Clock } from "@/shared/domain/clock";

export async function installBundledDecks(database: AppDatabase, clock: Clock): Promise<void> {
  const { deckPackageImportService } = createDeckPackageServices(database, clock);
  const appearanceRepository = new SQLiteDeckAppearanceRepository(database);
  for (let index = 0; index < bundledDeckPackageAssets.length; index += 1) {
    const assetModule = bundledDeckPackageAssets[index];
    if (assetModule === undefined) {
      continue;
    }
    const result = await deckPackageImportService.import(await readBundledDeckPackage(assetModule));
    const appearance = bundledDeckAppearanceData[index];
    if (result.status === "installed" && appearance) {
      await appearanceRepository.save(new DeckAppearance(appearance));
    }
  }
}
