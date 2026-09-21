import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { ExpoDeckPackageFileReader } from "@/features/decks/deck-installer/internal/expo-deck-package-file.reader";
import { InstalledAudioStorage } from "@/features/decks/deck-installer/internal/installed-audio-storage";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";

export function createDeckPackageServices(
  database: DrizzleDatabase,
  clock: Clock,
  existingDeckRepository?: DeckRepository,
  sessionSettlement: StudySessionSettlement | null = null
) {
  const audioStorage = new InstalledAudioStorage();
  const deckRepository = existingDeckRepository ?? new SQLiteDeckRepository(database);
  const installer = new DeckInstallerImpl(
    new ArchiveDeckPackageReader(),
    new SQLiteDeckPackageInstallationTransaction(database),
    audioStorage,
    clock,
    new ExpoDeckPackageFileReader(),
    deckRepository,
    sessionSettlement
  );
  return {
    answerAudioRepository: audioStorage,
    deckAudioRemover: audioStorage,
    deckInstaller: installer as DeckInstaller,
    installBundledPackage: (bytes: Uint8Array) => installer.installFromBytes(bytes),
  };
}

export type AppDatabase = DrizzleDatabase;
