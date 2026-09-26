import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";

export function createLearningEngineServices(database: DrizzleDatabase) {
  return {
    learningScheduler: createLearningScheduler(),
    flashcardMemoryStateRepository: new SQLiteFlashcardMemoryStateRepository(database),
  };
}
