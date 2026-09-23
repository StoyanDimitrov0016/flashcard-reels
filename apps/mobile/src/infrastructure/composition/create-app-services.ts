import type { SQLiteDatabase } from "expo-sqlite";

import { drizzle } from "drizzle-orm/expo-sqlite";

import type { AnswerAudioService } from "@/features/audio/domain/answer-audio.service";
import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackagePicker } from "@/features/decks/application/deck-package-picker";
import type { SavedProgressService } from "@/features/decks/application/saved-progress.service";
import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { ProgressBackupService } from "@/features/progress-backup/application/progress-backup.service";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";
import type { StudyService } from "@/features/study/domain/study.service";
import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

import { createDeckServices } from "@/infrastructure/composition/create-deck-services";
import { createFlashcardProgressService } from "@/infrastructure/composition/create-flashcard-progress-service";
import { createFlashcardService } from "@/infrastructure/composition/create-flashcard-service";
import { createLearningEngineServices } from "@/infrastructure/composition/create-learning-engine-services";
import { createProgressBackupService } from "@/infrastructure/composition/create-progress-backup-service";
import { createReelFeedService } from "@/infrastructure/composition/create-reel-feed-service";
import { createStudyService } from "@/infrastructure/composition/create-study-service";
import { SystemClock } from "@/infrastructure/system-clock";
import { UuidGenerator } from "@/infrastructure/uuid-generator";

export type AppServices = Readonly<{
  answerAudioService: AnswerAudioService;
  deckInstaller: DeckInstaller;
  deckPackageDownloader: DeckPackageDownloader;
  deckPackagePicker: DeckPackagePicker;
  deckService: DeckService;
  savedProgressService: SavedProgressService;
  flashcardService: FlashcardService;
  flashcardProgressService: FlashcardProgressService;
  progressBackupService: ProgressBackupService;
  reelFeedService: ReelFeedService;
  studyService: StudyService;
}>;

export function createAppServices(sqliteDatabase: SQLiteDatabase): AppServices {
  const database = drizzle<DatabaseSchema>(sqliteDatabase);
  const clock = new SystemClock();
  const { learningScheduler, flashcardMemoryStateRepository } =
    createLearningEngineServices(database);
  const studyService = createStudyService({
    database,
    clock,
    idGenerator: new UuidGenerator(),
    learningScheduler,
  });
  const flashcardService = createFlashcardService(database);
  const decks = createDeckServices({ database, clock, studyService });

  return {
    ...decks,
    flashcardService,
    flashcardProgressService: createFlashcardProgressService({
      database,
      clock,
      studyService,
      flashcardService,
    }),
    progressBackupService: createProgressBackupService({ database, clock, studyService }),
    reelFeedService: createReelFeedService({
      studyService,
      flashcardMemoryStateRepository,
      learningScheduler,
      clock,
    }),
    studyService,
  };
}
