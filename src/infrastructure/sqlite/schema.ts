import { z } from "zod";

import type { SQLiteDatabaseLike } from "@/infrastructure/sqlite/sqlite-database";

const CURRENT_SCHEMA_VERSION = 1;

const DatabaseVersionRowSchema = z.compile(z.object({ user_version: z.number().int() }));

const CANONICAL_SCHEMA = `
  CREATE TABLE decks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE deck_appearances (
    deck_id TEXT PRIMARY KEY NOT NULL,
    accent_color TEXT NOT NULL,
    background_color TEXT NOT NULL,
    FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
  );

  CREATE TABLE flashcards (
    id TEXT PRIMARY KEY NOT NULL,
    deck_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
  );

  CREATE TABLE study_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('mixed', 'focused')),
    deck_id TEXT,
    current_reel_position INTEGER NOT NULL CHECK (current_reel_position >= 0),
    created_at TEXT NOT NULL,
    completed_at TEXT,
    CHECK (
      (mode = 'mixed' AND deck_id IS NULL) OR
      (mode = 'focused' AND deck_id IS NOT NULL)
    ),
    FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE
  );

  CREATE TABLE study_session_items (
    id TEXT PRIMARY KEY NOT NULL,
    study_session_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    base_feed_position INTEGER NOT NULL CHECK (base_feed_position >= 0),
    UNIQUE (study_session_id, base_feed_position),
    FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
  );

  CREATE TABLE flashcard_review_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    study_session_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    reel_position INTEGER NOT NULL CHECK (reel_position >= 0),
    rating TEXT CHECK (rating IS NULL OR rating IN ('again', 'hard', 'good', 'easy')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    finalized_at TEXT,
    UNIQUE (study_session_id, reel_position),
    FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE
  );

  CREATE TABLE study_session_recurrences (
    id TEXT PRIMARY KEY NOT NULL,
    study_session_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    source_attempt_id TEXT NOT NULL,
    target_reel_position INTEGER NOT NULL CHECK (target_reel_position >= 0),
    created_at TEXT NOT NULL,
    consumed_at TEXT,
    FOREIGN KEY (study_session_id) REFERENCES study_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE,
    FOREIGN KEY (source_attempt_id) REFERENCES flashcard_review_attempts (id) ON DELETE CASCADE
  );

  CREATE INDEX flashcards_deck_id_idx ON flashcards (deck_id);
  CREATE INDEX study_sessions_active_scope_idx
    ON study_sessions (mode, completed_at, deck_id, created_at DESC, id DESC);
  CREATE INDEX study_session_items_flashcard_id_idx
    ON study_session_items (flashcard_id);
  CREATE INDEX review_attempts_flashcard_id_idx
    ON flashcard_review_attempts (flashcard_id);
  CREATE INDEX study_session_recurrences_session_position_idx
    ON study_session_recurrences (study_session_id, target_reel_position, created_at, id);
  CREATE INDEX study_session_recurrences_flashcard_id_idx
    ON study_session_recurrences (flashcard_id);
  CREATE INDEX study_session_recurrences_source_attempt_id_idx
    ON study_session_recurrences (source_attempt_id);
  CREATE UNIQUE INDEX study_session_recurrences_pending_target_idx
    ON study_session_recurrences (study_session_id, target_reel_position)
    WHERE consumed_at IS NULL;
  CREATE UNIQUE INDEX study_session_recurrences_pending_source_attempt_idx
    ON study_session_recurrences (source_attempt_id)
    WHERE consumed_at IS NULL;
`;

export async function initializeSchema(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");

  const versionRow = DatabaseVersionRowSchema.nullable().parse(
    await database.getFirstAsync("PRAGMA user_version")
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    return;
  }

  if (currentVersion !== 0) {
    throw new Error(
      `Unsupported database schema version ${currentVersion}; reset the local database`
    );
  }

  await database.withTransactionAsync(async () => {
    await database.execAsync(CANONICAL_SCHEMA);
    // A single baseline version lets stale development databases fail fast instead of being
    // mistaken for the canonical schema. There are no historical migrations to preserve.
    await database.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
  });
}
