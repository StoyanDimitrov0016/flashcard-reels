import { DeckPackageImportService } from "@/features/decks/application/deck-package-import.service";
import { ArchiveDeckPackageReader } from "@/features/decks/infrastructure/archive-deck-package.reader";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/infrastructure/sqlite-deck-package-installation.transaction";
import { InstalledAudioStorage } from "@/features/audio/infrastructure/installed-audio-storage";
import { ExpoDeckPackageFileReader } from "@/features/decks/infrastructure/expo-deck-package-file.reader";
import type { Clock } from "@/shared/domain/clock";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

export function createDeckPackageServices(database: DrizzleDatabase, clock: Clock) {
  const audioStorage = new InstalledAudioStorage();
  return {
    answerAudioRepository: audioStorage,
    deckPackageImportService: new DeckPackageImportService(
      new ArchiveDeckPackageReader(),
      new SQLiteDeckPackageInstallationTransaction(database),
      audioStorage,
      clock,
      new ExpoDeckPackageFileReader()
    ),
  };
}

export type AppDatabase = DrizzleDatabase;
