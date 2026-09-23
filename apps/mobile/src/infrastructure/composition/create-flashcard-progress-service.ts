import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { StudyService } from "@/features/study/domain/study.service";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";

import { FlashcardProgressServiceImpl } from "@/features/flashcard-progress/application/flashcard-progress.service.impl";
import { SQLiteFlashcardProgressQuery } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.query";
import { SQLiteFlashcardProgressRepository } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.repository";
import { SQLiteLearningProgressResetTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset-transaction";

type CreateFlashcardProgressServiceOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  studyService: StudyService & StudySessionSettlement;
  flashcardService: FlashcardService;
}>;

export function createFlashcardProgressService({
  database,
  clock,
  studyService,
  flashcardService,
}: CreateFlashcardProgressServiceOptions) {
  const progressRepository = new SQLiteFlashcardProgressRepository(database);
  return new FlashcardProgressServiceImpl(
    new SQLiteFlashcardProgressQuery(database, progressRepository),
    clock,
    new SQLiteLearningProgressResetTransaction(database),
    studyService,
    flashcardService
  );
}
