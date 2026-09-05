import type { SQLiteDatabaseLike } from "@/infrastructure/sqlite/sqlite-database";
import { initializeSchema } from "@/infrastructure/sqlite/schema";
import { seedDatabase } from "@/infrastructure/sqlite/seed";

export const DATABASE_NAME = "flashcard-reels.db";

export async function initializeDatabase(database: SQLiteDatabaseLike): Promise<void> {
  await initializeSchema(database);
  await seedDatabase(database);
}
