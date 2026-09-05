import type { SQLiteDatabase } from "expo-sqlite";

const DATABASE_VERSION = 1;

const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deck_appearances (
    deck_id TEXT PRIMARY KEY NOT NULL,
    accent_color TEXT NOT NULL,
    background_color TEXT NOT NULL,
    FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY NOT NULL,
    deck_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id TEXT PRIMARY KEY NOT NULL,
    flashcard_id TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('again', 'hard', 'good', 'easy')),
    reviewed_at TEXT NOT NULL,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS flashcards_deck_id_idx ON flashcards (deck_id);
  CREATE INDEX IF NOT EXISTS reviews_flashcard_id_idx ON flashcard_reviews (flashcard_id);
`;

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");

  const versionRow = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = versionRow ? versionRow.user_version : 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  await database.withTransactionAsync(async () => {
    if (currentVersion === 0) {
      await database.execAsync(INITIAL_SCHEMA);
    }
    await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}
