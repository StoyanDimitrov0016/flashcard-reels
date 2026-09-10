// oxlint-disable no-await-in-loop -- Bundled packages share one SQLite transaction boundary and are installed in registry order.
import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { Deck } from "@/features/decks/domain/deck.model";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import {
  bundledDeckRegistry,
  readBundledDeckPackage,
} from "@/infrastructure/bundled-deck-packages";
import {
  createDeckPackageServices,
  type AppDatabase,
} from "@/infrastructure/deck-package-services";
import {
  shouldApplyBundledAppearance,
  shouldInstallBundledDeck,
} from "@/infrastructure/bundled-deck-version";
import type { Clock } from "@/shared/domain/clock";

export async function installBundledDecks(database: AppDatabase, clock: Clock): Promise<void> {
  const deckRepository = new SQLiteDeckRepository(database);
  const { deckPackageImportService } = createDeckPackageServices(database, clock, deckRepository);
  const appearanceRepository = new SQLiteDeckAppearanceRepository(database);
  for (const definition of Object.values(bundledDeckRegistry)) {
    const installedVersion = await deckRepository.findVersion(definition.id);
    if (!shouldInstallBundledDeck(installedVersion, definition.version)) {
      continue;
    }
    const result = await deckPackageImportService.import(await readBundledDeckPackage(definition));
    if (!shouldApplyBundledAppearance(result.status)) {
      continue;
    }
    await appearanceRepository.save(
      new DeckAppearance({
        accentColor: definition.appearance.accentColor,
        backgroundColor: definition.appearance.backgroundColor,
        deckId: definition.id,
      })
    );
    const deck = await deckRepository.findById(definition.id);
    if (deck) {
      await deckRepository.save(
        new Deck({
          coverAsset: definition.appearance.coverAsset,
          createdAt: deck.createdAt,
          description: deck.description,
          id: deck.id,
          title: deck.title,
          updatedAt: deck.updatedAt,
          version: deck.version,
        })
      );
    }
  }
}
