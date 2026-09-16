import type { SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../../drizzle/migrations";
import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";
import { installBundledDecks } from "@/infrastructure/bundled-deck-installer";
import { SystemClock } from "@/infrastructure/system-clock";

export const DATABASE_NAME = "flashcard-reels.db";

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  let phase = "configuring the database";
  try {
    await database.execAsync("PRAGMA foreign_keys = ON");
    const drizzleDatabase = drizzle<DatabaseSchema>(database);
    phase = "applying database migrations";
    await migrate(drizzleDatabase, migrations);
    phase = "installing bundled decks";
    await installBundledDecks(drizzleDatabase, new SystemClock());
  } catch (cause) {
    // SQLiteProvider cannot close a connection when onInit rejects before returning it.
    try {
      await database.closeAsync();
    } catch {
      // Preserve the startup failure rather than replacing it with a cleanup failure.
    }
    throw new Error(`Startup failed while ${phase}`, { cause });
  }
}
