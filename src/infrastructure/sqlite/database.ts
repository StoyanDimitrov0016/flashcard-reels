import type { SQLiteDatabase } from "expo-sqlite";

import { runMigrations } from "@/infrastructure/sqlite/migrations";
import { seedDatabase } from "@/infrastructure/sqlite/seed";

export const DATABASE_NAME = "flashcard-reels.db";

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await runMigrations(database);
  await seedDatabase(database);
}
