import { deckIdBySeedKey } from "@/features/decks/data/decks";
import { flashcardIdBySeedKey } from "@/features/flashcards/data/flashcard-ids";
import type { SQLiteDatabaseLike } from "@/infrastructure/sqlite/sqlite-database";
import { z } from "zod";

const DATABASE_VERSION = 5;
const DatabaseColumnRowSchema = z.compile(z.object({ name: z.string() }));
const DatabaseVersionRowSchema = z.compile(z.object({ user_version: z.number().int() }));
const LegacyAttemptRowSchema = z.compile(z.object({ created_at: z.string() }));
const TableNameRowSchema = z.compile(z.object({ name: z.string() }));

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

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('mixed', 'focused')),
    deck_id TEXT,
    current_position INTEGER NOT NULL CHECK (current_position >= 0),
    created_at TEXT NOT NULL,
    completed_at TEXT,
    CHECK (
      (mode = 'mixed' AND deck_id IS NULL) OR
      (mode = 'focused' AND deck_id IS NOT NULL)
    ),
    FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS study_sessions_completed_at_idx
    ON study_sessions (completed_at);

  CREATE TABLE IF NOT EXISTS study_session_items (
    id TEXT PRIMARY KEY NOT NULL,
    study_session_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    UNIQUE (study_session_id, position),
    FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS study_session_items_flashcard_id_idx
    ON study_session_items (flashcard_id);

  CREATE TABLE IF NOT EXISTS flashcard_review_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    study_session_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    reel_position INTEGER NOT NULL,
    rating TEXT CHECK (rating IS NULL OR rating IN ('again', 'hard', 'good', 'easy')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    finalized_at TEXT,
    FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS review_attempts_study_session_id_idx
    ON flashcard_review_attempts (study_session_id);
  CREATE INDEX IF NOT EXISTS review_attempts_flashcard_id_idx
    ON flashcard_review_attempts (flashcard_id);

  CREATE TABLE IF NOT EXISTS study_session_recurrences (
    id TEXT PRIMARY KEY NOT NULL,
    study_session_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    source_attempt_id TEXT NOT NULL,
    target_position INTEGER NOT NULL CHECK (target_position >= 0),
    created_at TEXT NOT NULL,
    consumed_at TEXT,
    FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE,
    FOREIGN KEY (source_attempt_id) REFERENCES flashcard_review_attempts (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS study_session_recurrences_session_id_idx
    ON study_session_recurrences (study_session_id, target_position);
  CREATE INDEX IF NOT EXISTS study_session_recurrences_source_attempt_id_idx
    ON study_session_recurrences (source_attempt_id);
  CREATE UNIQUE INDEX IF NOT EXISTS study_session_recurrences_pending_target_idx
    ON study_session_recurrences (study_session_id, target_position)
    WHERE consumed_at IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS study_session_recurrences_pending_source_attempt_idx
    ON study_session_recurrences (source_attempt_id)
    WHERE consumed_at IS NULL;
`;

export async function runMigrations(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");

  const versionRow = DatabaseVersionRowSchema.nullable().parse(
    await database.getFirstAsync("PRAGMA user_version")
  );
  const currentVersion = versionRow ? versionRow.user_version : 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  await database.withTransactionAsync(async () => {
    if (currentVersion === 0) {
      await database.execAsync(INITIAL_SCHEMA);
    }
    if (currentVersion === 1) {
      await migrateCatalogIds(database);
    }
    if (currentVersion > 0 && currentVersion < 3) {
      await migrateStudySessions(database);
    }
    if (currentVersion > 0 && currentVersion < 4) {
      await migrateStudySessionItems(database);
    }
    if (currentVersion > 0 && currentVersion < 5) {
      await migrateStudySessionRecurrences(database);
    }
    await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}

async function migrateStudySessionRecurrences(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS study_session_recurrences (
      id TEXT PRIMARY KEY NOT NULL,
      study_session_id TEXT NOT NULL,
      flashcard_id TEXT NOT NULL,
      source_attempt_id TEXT NOT NULL,
      target_position INTEGER NOT NULL CHECK (target_position >= 0),
      created_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE,
      FOREIGN KEY (source_attempt_id) REFERENCES flashcard_review_attempts (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS study_session_recurrences_session_id_idx
      ON study_session_recurrences (study_session_id, target_position);
    CREATE INDEX IF NOT EXISTS study_session_recurrences_source_attempt_id_idx
      ON study_session_recurrences (source_attempt_id);
    CREATE UNIQUE INDEX IF NOT EXISTS study_session_recurrences_pending_target_idx
      ON study_session_recurrences (study_session_id, target_position)
      WHERE consumed_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS study_session_recurrences_pending_source_attempt_idx
      ON study_session_recurrences (source_attempt_id)
      WHERE consumed_at IS NULL;
  `);
}

async function migrateStudySessionItems(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS study_session_items (
      id TEXT PRIMARY KEY NOT NULL,
      study_session_id TEXT NOT NULL,
      flashcard_id TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0),
      UNIQUE (study_session_id, position),
      FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS study_session_items_flashcard_id_idx
      ON study_session_items (flashcard_id);
  `);
}

async function migrateStudySessions(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync("PRAGMA defer_foreign_keys = ON;");
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('mixed', 'focused')),
      deck_id TEXT,
      current_position INTEGER NOT NULL CHECK (current_position >= 0),
      created_at TEXT NOT NULL,
      completed_at TEXT,
      CHECK (
        (mode = 'mixed' AND deck_id IS NULL) OR
        (mode = 'focused' AND deck_id IS NOT NULL)
      ),
      FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS study_sessions_completed_at_idx
      ON study_sessions (completed_at);
  `);

  const attemptsTable = TableNameRowSchema.nullable().parse(
    await database.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'flashcard_review_attempts'"
    )
  );
  if (!attemptsTable) {
    await database.execAsync(`
      CREATE TABLE flashcard_review_attempts (
        id TEXT PRIMARY KEY NOT NULL,
        study_session_id TEXT NOT NULL,
        flashcard_id TEXT NOT NULL,
        reel_position INTEGER NOT NULL,
        rating TEXT CHECK (rating IS NULL OR rating IN ('again', 'hard', 'good', 'easy')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        finalized_at TEXT,
        FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS review_attempts_study_session_id_idx
        ON flashcard_review_attempts (study_session_id);
      CREATE INDEX IF NOT EXISTS review_attempts_flashcard_id_idx
        ON flashcard_review_attempts (flashcard_id);
    `);
    return;
  }

  const columns = (await database.getAllAsync("PRAGMA table_info(flashcard_review_attempts)")).map(
    (column) => DatabaseColumnRowSchema.parse(column)
  );
  if (columns.some((column) => column.name === "study_session_id")) {
    return;
  }

  const legacySessionId = "00000000-0000-4000-8000-000000000000";
  const legacyAttempt = LegacyAttemptRowSchema.nullable().parse(
    await database.getFirstAsync(
      "SELECT created_at FROM flashcard_review_attempts ORDER BY created_at, id LIMIT 1"
    )
  );
  if (legacyAttempt) {
    await database.runAsync(
      `INSERT OR IGNORE INTO study_sessions
        (id, mode, deck_id, current_position, created_at, completed_at)
       VALUES (?, 'mixed', NULL, 0, ?, ?)`,
      legacySessionId,
      legacyAttempt.created_at,
      legacyAttempt.created_at
    );
  }

  await database.execAsync(`
    CREATE TABLE flashcard_review_attempts_new (
      id TEXT PRIMARY KEY NOT NULL,
      study_session_id TEXT NOT NULL,
      flashcard_id TEXT NOT NULL,
      reel_position INTEGER NOT NULL,
      rating TEXT CHECK (rating IS NULL OR rating IN ('again', 'hard', 'good', 'easy')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finalized_at TEXT,
      FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
    );
    INSERT INTO flashcard_review_attempts_new
      (id, study_session_id, flashcard_id, reel_position, rating, created_at, updated_at, finalized_at)
    SELECT id, '${legacySessionId}', flashcard_id, reel_position, rating, created_at, updated_at, finalized_at
    FROM flashcard_review_attempts;
    DROP TABLE flashcard_review_attempts;
    ALTER TABLE flashcard_review_attempts_new RENAME TO flashcard_review_attempts;
    CREATE INDEX IF NOT EXISTS review_attempts_study_session_id_idx
      ON flashcard_review_attempts (study_session_id);
    CREATE INDEX IF NOT EXISTS review_attempts_flashcard_id_idx
      ON flashcard_review_attempts (flashcard_id);
  `);
}

async function migrateCatalogIds(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync("PRAGMA defer_foreign_keys = ON;");

  await Promise.all(
    Object.entries(flashcardIdBySeedKey).map(([seedKey, id]) =>
      database.runAsync(
        "UPDATE flashcard_reviews SET flashcard_id = ? WHERE flashcard_id = ?",
        id,
        seedKey
      )
    )
  );
  await Promise.all(
    Object.entries(flashcardIdBySeedKey).map(([seedKey, id]) =>
      database.runAsync("UPDATE flashcards SET id = ? WHERE id = ?", id, seedKey)
    )
  );
  await Promise.all(
    Object.entries(deckIdBySeedKey).map(([seedKey, id]) =>
      database.runAsync("UPDATE deck_appearances SET deck_id = ? WHERE deck_id = ?", id, seedKey)
    )
  );
  await Promise.all(
    Object.entries(deckIdBySeedKey).map(([seedKey, id]) =>
      database.runAsync("UPDATE flashcards SET deck_id = ? WHERE deck_id = ?", id, seedKey)
    )
  );
  await Promise.all(
    Object.entries(deckIdBySeedKey).map(([seedKey, id]) =>
      database.runAsync("UPDATE decks SET id = ? WHERE id = ?", id, seedKey)
    )
  );
}
