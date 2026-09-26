import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { FlashcardServiceImpl } from "@/features/flashcards/application/flashcard.service.impl";
import { SQLiteFlashcardAvailabilityQuery } from "@/features/flashcards/infrastructure/sqlite-flashcard-availability.query";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";

export function createFlashcardService(database: DrizzleDatabase): FlashcardService {
  return new FlashcardServiceImpl(
    new SQLiteFlashcardRepository(database),
    new SQLiteFlashcardAvailabilityQuery(database)
  );
}
