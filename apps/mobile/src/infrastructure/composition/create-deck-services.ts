import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { StudyService } from "@/features/study/domain/study.service";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { FlashcardAudioServiceImpl } from "@/features/audio/application/flashcard-audio.service.impl";
import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { SavedProgressServiceImpl } from "@/features/decks/application/saved-progress.service.impl";
import { ExpoDeckPackageDownloader } from "@/features/decks/infrastructure/expo-deck-package.downloader";
import { ExpoDeckPackagePicker } from "@/features/decks/infrastructure/expo-deck-package.picker";
import { SQLiteArchivedProgressQuery } from "@/features/decks/infrastructure/sqlite-archived-progress.query";
import { SQLiteDeckProgressRepository } from "@/features/decks/infrastructure/sqlite-deck-progress.repository";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckThemeSelectionRepository } from "@/features/decks/infrastructure/sqlite-deck-theme-selection.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { SQLiteSavedProgressContinuationTransaction } from "@/features/decks/infrastructure/sqlite-saved-progress-continuation.transaction";
import { SQLiteSavedProgressDeletionTransaction } from "@/features/decks/infrastructure/sqlite-saved-progress-deletion.transaction";
import { createDeckPackageServices } from "@/infrastructure/deck-package-services";

type CreateDeckServicesOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  idGenerator: IdGenerator;
  studyService: StudyService & StudySessionSettlement;
}>;

export function createDeckServices({
  database,
  clock,
  idGenerator,
  studyService,
}: CreateDeckServicesOptions) {
  const deckRepository = new SQLiteDeckRepository(database);
  const { flashcardAudioRepository, deckAudioRemover, deckInstaller } = createDeckPackageServices({
    database,
    clock,
    deckRepository,
    idGenerator,
    sessionSettlement: studyService,
  });

  return {
    flashcardAudioService: new FlashcardAudioServiceImpl(flashcardAudioRepository),
    deckInstaller,
    deckPackageDownloader: new ExpoDeckPackageDownloader(),
    deckPackagePicker: new ExpoDeckPackagePicker(),
    deckService: new DeckServiceImpl(
      deckRepository,
      new SQLiteDeckThemeSelectionRepository(database, idGenerator),
      new SQLiteDeckRemovalTransaction(database),
      deckAudioRemover,
      studyService
    ),
    savedProgressService: new SavedProgressServiceImpl(
      new SQLiteArchivedProgressQuery(database),
      new SQLiteDeckProgressRepository(database),
      new SQLiteSavedProgressDeletionTransaction(database),
      new SQLiteSavedProgressContinuationTransaction(database)
    ),
  };
}
