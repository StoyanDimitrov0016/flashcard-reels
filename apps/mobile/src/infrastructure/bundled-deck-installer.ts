import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

// oxlint-disable no-await-in-loop -- Bundled packages share one SQLite transaction boundary and are installed in registry order.
import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { Deck } from "@/features/decks/domain/deck.model";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteRemovedDeckRepository } from "@/features/decks/infrastructure/sqlite-removed-deck.repository";
import {
  bundledDeckRegistry,
  readBundledDeckPackage,
} from "@/infrastructure/bundled-deck-packages";
import {
  shouldApplyBundledAppearance,
  shouldInstallBundledDeck,
} from "@/infrastructure/bundled-deck-version";
import {
  createDeckPackageServices,
  type AppDatabase,
} from "@/infrastructure/deck-package-services";

export async function installBundledDecks(
  database: AppDatabase,
  clock: Clock,
  idGenerator: IdGenerator
): Promise<void> {
  const deckRepository = new SQLiteDeckRepository(database);
  const removedDeckRepository = new SQLiteRemovedDeckRepository(database);
  const { installBundledPackage } = createDeckPackageServices({
    database,
    clock,
    deckRepository,
    idGenerator,
    sessionSettlement: null,
  });
  const themeSelectionRepository = new SQLiteDeckThemeSelectionRepository(database, idGenerator);
  for (const definition of Object.values(bundledDeckRegistry)) {
    if (await removedDeckRepository.wasRemoved(definition.id)) {
      continue;
    }
    const installedVersion = await deckRepository.findVersion(definition.id);
    if (!shouldInstallBundledDeck(installedVersion, definition.version)) {
      continue;
    }
    const result = await installBundledPackage(await readBundledDeckPackage(definition));
    if (!shouldApplyBundledAppearance(result.status)) {
      continue;
    }
    await themeSelectionRepository.save(
      new DeckThemeSelection({
        deckId: definition.id,
        theme: definition.appearance.theme,
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
