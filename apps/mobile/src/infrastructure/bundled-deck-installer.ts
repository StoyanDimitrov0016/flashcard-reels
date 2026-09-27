import type { Clock } from "@/shared/domain/clock";

// oxlint-disable no-await-in-loop -- Bundled packages share one SQLite transaction boundary and are installed in registry order.
import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { Deck } from "@/features/decks/domain/deck.model";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteRemovedDeckRepository } from "@/features/decks/infrastructure/sqlite-removed-deck.repository";
import {
  bundledDeckRegistry,
  readBundledDeckPackage,
} from "@/infrastructure/bundled-deck-packages";
import {
  shouldApplyBundledAppearance,
  shouldInstallBundledDeck,
} from "@/infrastructure/bundled-deck-revision";
import {
  createDeckPackageServices,
  type AppDatabase,
} from "@/infrastructure/deck-package-services";

export async function installBundledDecks(database: AppDatabase, clock: Clock): Promise<void> {
  const deckRepository = new SQLiteDeckRepository(database);
  const removedDeckRepository = new SQLiteRemovedDeckRepository(database);
  const { installBundledPackage } = createDeckPackageServices({
    database,
    clock,
    deckRepository,
    sessionSettlement: null,
  });
  const appearanceRepository = new SQLiteDeckAppearanceRepository(database);
  for (const definition of Object.values(bundledDeckRegistry)) {
    if (await removedDeckRepository.wasRemoved(definition.id)) {
      continue;
    }
    const installedRevision = await deckRepository.findRevision(definition.id);
    if (!shouldInstallBundledDeck(installedRevision, definition.revision)) {
      continue;
    }
    const result = await installBundledPackage(await readBundledDeckPackage(definition));
    if (!shouldApplyBundledAppearance(result.status)) {
      continue;
    }
    await appearanceRepository.save(
      new DeckAppearance({
        deckId: definition.id,
        presetId: definition.appearance.presetId,
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
          revision: deck.revision,
        })
      );
    }
  }
}
