import type { SQLiteDatabase } from "expo-sqlite";

import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

import { installBundledDecks } from "@/infrastructure/bundled-deck-installer";
import { StartupError, type StartupErrorCode } from "@/infrastructure/errors/startup-error";
import { SystemClock } from "@/infrastructure/system-clock";
import { AppError } from "@/shared/errors/app-error";

import migrations from "../../../drizzle/migrations";

export const DATABASE_NAME = "flashcard-reels.db";

type StartupPhase =
  | "configuring the database"
  | "applying database migrations"
  | "installing bundled decks";

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  let phase: StartupPhase = "configuring the database";
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
    throw new StartupError({
      cause,
      code: getStartupErrorCode(phase),
      context: { phase },
      message: `Startup failed while ${phase}`,
    });
  }
}

export function handleSQLiteProviderError(error: Error): never {
  if (error instanceof AppError) {
    throw error;
  }
  throw new AppError({
    cause: error,
    code: "DATABASE_UNAVAILABLE",
    message: "The SQLite database is unavailable",
    name: "DatabaseUnavailableError",
  });
}

const startupErrorCodes: Record<StartupPhase, StartupErrorCode> = {
  "applying database migrations": "DATABASE_MIGRATION_FAILED",
  "configuring the database": "DATABASE_CONFIGURATION_FAILED",
  "installing bundled decks": "BUNDLED_DECK_INSTALL_FAILED",
};

function getStartupErrorCode(phase: StartupPhase): StartupErrorCode {
  return startupErrorCodes[phase];
}
