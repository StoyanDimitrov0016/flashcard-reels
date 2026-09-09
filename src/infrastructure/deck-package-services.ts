import { DeckPackageImportService } from "@/features/decks/application/deck-package-import.service";
import { ArchiveDeckPackageReader } from "@/features/decks/infrastructure/archive-deck-package.reader";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/infrastructure/sqlite-deck-package-installation.transaction";
import { InstalledAudioStorage } from "@/features/audio/infrastructure/installed-audio-storage";
import { ExpoDeckPackageFileReader } from "@/features/decks/infrastructure/expo-deck-package-file.reader";
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
  return {
    answerAudioRepository: audioStorage,
    deckPackageImportService: new DeckPackageImportService(
      new ArchiveDeckPackageReader(),
      new SQLiteDeckPackageInstallationTransaction(database),
      audioStorage,
      clock,
      new ExpoDeckPackageFileReader(),
      deckRepository
    ),
  };
}

export type AppDatabase = DrizzleDatabase;
