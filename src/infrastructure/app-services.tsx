import { createContext, type ReactNode, useContext, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { BundledAnswerAudioRepository } from "@/features/audio/infrastructure/bundled-answer-audio.repository";
import { AnswerAudioService } from "@/features/audio/services/answer-audio.service";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import { DeckService } from "@/features/decks/services/deck.service";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { FlashcardService } from "@/features/flashcards/services/flashcard.service";
import { SQLiteReviewRepository } from "@/features/study/infrastructure/sqlite-review.repository";
import { StudyService } from "@/features/study/services/study.service";
import { RandomIdGenerator } from "@/infrastructure/random-id-generator";
import { SystemClock } from "@/infrastructure/system-clock";

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
    const reviewRepository = new SQLiteReviewRepository(database);
    const clock = new SystemClock();
    const idGenerator = new RandomIdGenerator();

    return {
      answerAudioService: new AnswerAudioService(new BundledAnswerAudioRepository()),
      deckService: new DeckService(deckRepository, deckAppearanceRepository),
      flashcardService: new FlashcardService(flashcardRepository),
      studyService: new StudyService(reviewRepository, clock, idGenerator),
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
