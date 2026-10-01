import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

// oxlint-disable no-await-in-loop -- Bundled packages install in registry order; appearance writes are repaired on subsequent starts.
import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteDismissedBundledDeckRepository } from "@/features/decks/infrastructure/sqlite-dismissed-bundled-deck.repository";
import {
  bundledDeckRegistry,
  readBundledDeckPackage,
} from "@/infrastructure/bundled-deck-packages";
import { shouldInstallBundledDeck } from "@/infrastructure/bundled-deck-revision";
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
  const dismissedBundledDeckRepository = new SQLiteDismissedBundledDeckRepository(database);
  const { installBundledPackage } = createDeckPackageServices({
    database,
    clock,
    deckRepository,
    idGenerator,
    sessionSettlement: null,
  });
  const themeSelectionRepository = new SQLiteDeckThemeSelectionRepository(database, idGenerator);
  for (const definition of Object.values(bundledDeckRegistry)) {
    if (await dismissedBundledDeckRepository.wasRemoved(definition.id)) {
      continue;
    }
    const installedRevision = await deckRepository.findRevision(definition.id);
    const existingTheme = await themeSelectionRepository.findByDeckId(definition.id);
    if (shouldInstallBundledDeck(installedRevision, definition.revision)) {
      await installBundledPackage(await readBundledDeckPackage(definition));
    }
    const installedDeck = await deckRepository.findById(definition.id);
    if (!installedDeck) {
      continue;
    }
    if (!existingTheme) {
      await themeSelectionRepository.save(
        new DeckThemeSelection({
          deckId: definition.id,
          theme: definition.appearance.theme,
        })
      );
    }
    if (installedDeck.coverAsset !== definition.appearance.coverAsset) {
      await deckRepository.updateCoverAsset(definition.id, definition.appearance.coverAsset);
    }
  }
}
