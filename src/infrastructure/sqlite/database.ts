import type { SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../../drizzle/migrations";
import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";
import { installBundledDecks } from "@/infrastructure/bundled-deck-installer";
import { SystemClock } from "@/infrastructure/system-clock";

export const DATABASE_NAME = "flashcard-reels.db";

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON");
  const drizzleDatabase = drizzle<DatabaseSchema>(database);
  await migrate(drizzleDatabase, migrations);
  await installBundledDecks(drizzleDatabase, new SystemClock());
}
