import { createContext, type ReactNode, useContext, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { BundledAnswerAudioRepository } from "@/features/audio/infrastructure/bundled-answer-audio.repository";
import { AnswerAudioService } from "@/features/audio/services/answer-audio.service";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { DeckService } from "@/features/decks/services/deck.service";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { FlashcardService } from "@/features/flashcards/services/flashcard.service";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { StudyService } from "@/features/study/services/study.service";
import { SystemClock } from "@/infrastructure/system-clock";
import { UuidGenerator } from "@/infrastructure/uuid-generator";

type AppServices = Readonly<{
  answerAudioService: AnswerAudioService;
  deckService: DeckService;
  flashcardService: FlashcardService;
  studyService: StudyService;
}>;

const AppServicesContext = createContext<AppServices | null>(null);

type AppServicesProviderProps = Readonly<{ children: ReactNode }>;

export function AppServicesProvider({ children }: AppServicesProviderProps) {
  const database = useSQLiteContext();
  const [services] = useState(() => {
    const deckRepository = new SQLiteDeckRepository(database);
    const deckAppearanceRepository = new SQLiteDeckAppearanceRepository(database);
    const flashcardRepository = new SQLiteFlashcardRepository(database);
    const reviewAttemptRepository = new SQLiteReviewAttemptRepository(database);
    const clock = new SystemClock();
    const idGenerator = new UuidGenerator();

    return {
      answerAudioService: new AnswerAudioService(new BundledAnswerAudioRepository()),
      deckService: new DeckService(deckRepository, deckAppearanceRepository),
      flashcardService: new FlashcardService(flashcardRepository),
      studyService: new StudyService(reviewAttemptRepository, clock, idGenerator),
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
