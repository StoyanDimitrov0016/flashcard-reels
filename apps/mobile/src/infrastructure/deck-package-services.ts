import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { BundledAppearance } from "@/features/decks/deck-installer/internal/deck-package.model";
import type { DeckRepository } from "@/features/decks/domain/deck.repository";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { ContractDeckPackageReader } from "@/features/decks/deck-installer/internal/contract-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { ExpoDeckPackageFileReader } from "@/features/decks/deck-installer/internal/expo-deck-package-file.reader";
import { InstalledAudioStorage } from "@/features/decks/deck-installer/internal/installed-audio-storage";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";

type CreateDeckPackageServicesOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  deckRepository: DeckRepository;
  idGenerator: IdGenerator;
  sessionSettlement: StudySessionSettlement | null;
}>;

export function createDeckPackageServices({
  database,
  clock,
  deckRepository,
  idGenerator,
  sessionSettlement,
}: CreateDeckPackageServicesOptions) {
  const audioStorage = new InstalledAudioStorage();
  const installer = new DeckInstallerImpl(
    new ContractDeckPackageReader(),
    new SQLiteDeckPackageInstallationTransaction(database, idGenerator),
    audioStorage,
    clock,
    new ExpoDeckPackageFileReader(),
    deckRepository,
    sessionSettlement
  );
  return {
    flashcardAudioRepository: audioStorage,
    deckAudioRemover: audioStorage,
    deckInstaller: installer as DeckInstaller,
    installBundledPackage: (bytes: Uint8Array, appearance: BundledAppearance) =>
      installer.installFromBytes(bytes, appearance),
  };
}

export type AppDatabase = DrizzleDatabase;
