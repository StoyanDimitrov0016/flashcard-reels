import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { ExpoDeckPackageFileReader } from "@/features/decks/deck-installer/internal/expo-deck-package-file.reader";
import { InstalledAudioStorage } from "@/features/decks/deck-installer/internal/installed-audio-storage";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import type { DeckInstaller } from "@/features/decks/deck-installer";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { Clock } from "@/shared/domain/clock";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

export function createDeckPackageServices(
  database: DrizzleDatabase,
  clock: Clock,
  existingDeckRepository?: DeckRepository
) {
  const audioStorage = new InstalledAudioStorage();
  const deckRepository = existingDeckRepository ?? new SQLiteDeckRepository(database);
  const installer = new DeckInstallerImpl(
    new ArchiveDeckPackageReader(),
    new SQLiteDeckPackageInstallationTransaction(database),
    audioStorage,
    clock,
    new ExpoDeckPackageFileReader(),
    deckRepository
  );
  return {
    answerAudioRepository: audioStorage,
    deckInstaller: installer as DeckInstaller,
    installBundledPackage: (bytes: Uint8Array) => installer.installFromBytes(bytes),
  };
}

export type AppDatabase = DrizzleDatabase;
