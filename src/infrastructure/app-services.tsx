import { createContext, type ReactNode, useContext, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

import { BundledAnswerAudioRepository } from "@/features/audio/infrastructure/bundled-answer-audio.repository";
import { AnswerAudioService } from "@/features/audio/services/answer-audio.service";
import { SQLiteLearnerProfileAggregationTransaction } from "@/features/learner-profile/infrastructure/sqlite-learner-profile-aggregation-transaction";
import { SQLiteLearnerProfileRepository } from "@/features/learner-profile/infrastructure/sqlite-learner-profile.repository";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { DeckService } from "@/features/decks/services/deck.service";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { FlashcardService } from "@/features/flashcards/services/flashcard.service";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { StudyService } from "@/features/study/services/study.service";
import { ReelFeedService } from "@/features/reels/services/reel-feed.service";
import { SystemClock } from "@/infrastructure/system-clock";
import { UuidGenerator } from "@/infrastructure/uuid-generator";
import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

type AppServices = Readonly<{
  answerAudioService: AnswerAudioService;
  deckService: DeckService;
  flashcardService: FlashcardService;
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
    const reviewAttemptRepository = new SQLiteReviewAttemptRepository(drizzleDatabase);
    const reviewAttemptTransaction = new SQLiteReviewAttemptTransaction(drizzleDatabase);
    const learnerProfileRepository = new SQLiteLearnerProfileRepository(drizzleDatabase);
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
    const clock = new SystemClock();
    const idGenerator = new UuidGenerator();
    const studyService = new StudyService(
      reviewAttemptRepository,
      studySessionRepository,
      studySessionItemRepository,
      studySessionRecurrenceRepository,
      clock,
      idGenerator,
      reviewAttemptTransaction,
      studySessionFeedTransaction,
      studySessionLifecycleTransaction,
      Math.random,
      learnerProfileAggregationTransaction,
      learnerProfileRepository
    );

    return {
      answerAudioService: new AnswerAudioService(new BundledAnswerAudioRepository()),
      deckService: new DeckService(deckRepository, deckAppearanceRepository),
      flashcardService: new FlashcardService(flashcardRepository),
      reelFeedService: new ReelFeedService(studyService),
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
