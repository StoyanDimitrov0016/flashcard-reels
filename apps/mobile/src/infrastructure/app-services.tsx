import { drizzle } from "drizzle-orm/expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import { createContext, type ReactNode, useContext, useState } from "react";

import type { AnswerAudioService } from "@/features/audio/domain/answer-audio.service";
import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackagePicker } from "@/features/decks/application/deck-package-picker";
import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { LearnerProfileService } from "@/features/learner-profile/domain/learner-profile.service";
import type { ReelFeedService } from "@/features/reels/domain/reel-feed.service";
import type { StudyService } from "@/features/study/domain/study.service";
import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

import { AnswerAudioServiceImpl } from "@/features/audio/application/answer-audio.service.impl";
import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { ExpoDeckPackageDownloader } from "@/features/decks/infrastructure/expo-deck-package.downloader";
import { ExpoDeckPackagePicker } from "@/features/decks/infrastructure/expo-deck-package.picker";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { FlashcardServiceImpl } from "@/features/flashcards/application/flashcard.service.impl";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { LearnerProfileServiceImpl } from "@/features/learner-profile/application/learner-profile.service.impl";
import { SQLiteLearnerProfileAggregationTransaction } from "@/features/learner-profile/infrastructure/sqlite-learner-profile-aggregation-transaction";
import { SQLiteLearnerProfileRepository } from "@/features/learner-profile/infrastructure/sqlite-learner-profile.repository";
import { SQLiteLearningProgressResetTransaction } from "@/features/learner-profile/infrastructure/sqlite-learning-progress-reset-transaction";
import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";
import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionMaintenanceTransaction } from "@/features/study/infrastructure/sqlite-study-session-maintenance-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import { createDeckPackageServices } from "@/infrastructure/deck-package-services";
import { SystemClock } from "@/infrastructure/system-clock";
import { UuidGenerator } from "@/infrastructure/uuid-generator";

type AppServices = Readonly<{
  answerAudioService: AnswerAudioService;
  deckInstaller: DeckInstaller;
  deckPackageDownloader: DeckPackageDownloader;
  deckPackagePicker: DeckPackagePicker;
  deckService: DeckService;
  flashcardService: FlashcardService;
  learnerProfileService: LearnerProfileService;
  reelFeedService: ReelFeedService;
  studyService: StudyService;
}>;

const AppServicesContext = createContext<AppServices | null>(null);

type AppServicesProviderProps = Readonly<{ children: ReactNode }>;

export function AppServicesProvider({ children }: AppServicesProviderProps) {
  const database = useSQLiteContext();
  const [services] = useState(() => {
    const drizzleDatabase = drizzle<DatabaseSchema>(database);
    const deckRepository = new SQLiteDeckRepository(drizzleDatabase);
    const deckAppearanceRepository = new SQLiteDeckAppearanceRepository(drizzleDatabase);
    const flashcardRepository = new SQLiteFlashcardRepository(drizzleDatabase);
    const flashcardService = new FlashcardServiceImpl(flashcardRepository);
    const reviewAttemptRepository = new SQLiteReviewAttemptRepository(drizzleDatabase);
    const reviewAttemptTransaction = new SQLiteReviewAttemptTransaction(drizzleDatabase);
    const learningScheduler = createLearningScheduler();
    const flashcardMemoryStateRepository = new SQLiteFlashcardMemoryStateRepository(
      drizzleDatabase
    );
    const reviewAttemptFinalizationTransaction = new SQLiteReviewAttemptFinalizationTransaction(
      drizzleDatabase,
      learningScheduler
    );
    const learnerProfileRepository = new SQLiteLearnerProfileRepository(drizzleDatabase);
    const learningProgressResetTransaction = new SQLiteLearningProgressResetTransaction(
      drizzleDatabase
    );
    const learnerProfileAggregationTransaction = new SQLiteLearnerProfileAggregationTransaction(
      drizzleDatabase
    );
    const studySessionItemRepository = new SQLiteStudySessionItemRepository(drizzleDatabase);
    const studySessionFeedTransaction = new SQLiteStudySessionFeedTransaction(drizzleDatabase);
    const studySessionRecurrenceRepository = new SQLiteStudySessionRecurrenceRepository(
      drizzleDatabase
    );
    const studySessionRepository = new SQLiteStudySessionRepository(drizzleDatabase);
    const studySessionLifecycleTransaction = new SQLiteStudySessionLifecycleTransaction(
      drizzleDatabase
    );
    const studySessionMaintenanceTransaction = new SQLiteStudySessionMaintenanceTransaction(
      drizzleDatabase
    );
    const clock = new SystemClock();
    const idGenerator = new UuidGenerator();
    const studyService = new StudyServiceImpl(
      reviewAttemptRepository,
      studySessionRepository,
      studySessionItemRepository,
      studySessionRecurrenceRepository,
      clock,
      idGenerator,
      reviewAttemptTransaction,
      studySessionFeedTransaction,
      studySessionLifecycleTransaction,
      reviewAttemptFinalizationTransaction,
      Math.random,
      learnerProfileAggregationTransaction,
      studySessionMaintenanceTransaction
    );
    const { answerAudioRepository, deckAudioRemover, deckInstaller } = createDeckPackageServices(
      drizzleDatabase,
      clock,
      deckRepository,
      studyService
    );

    return {
      answerAudioService: new AnswerAudioServiceImpl(answerAudioRepository),
      deckInstaller,
      deckPackageDownloader: new ExpoDeckPackageDownloader(),
      deckPackagePicker: new ExpoDeckPackagePicker(),
      deckService: new DeckServiceImpl(
        deckRepository,
        deckAppearanceRepository,
        deckAudioRemover,
        studyService
      ),
      flashcardService,
      learnerProfileService: new LearnerProfileServiceImpl(
        learnerProfileRepository,
        clock,
        learningProgressResetTransaction,
        studyService,
        flashcardService
      ),
      reelFeedService: new ReelFeedServiceImpl(
        studyService,
        flashcardMemoryStateRepository,
        learningScheduler,
        clock
      ),
      studyService,
    };
  });

  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new Error("useAppServices requires AppServicesProvider");
  }
  return services;
}
