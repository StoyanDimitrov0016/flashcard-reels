import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const learnerPreferences = sqliteTable(
  "learner_preferences",
  {
    id: text("id").primaryKey().notNull(),
    colorMode: text("color_mode", { enum: ["light", "dark", "device"] }).notNull(),
    studyIslandPosition: text("study_island_position", {
      enum: ["left", "bottom", "right"],
    }).notNull(),
    ratingDirection: text("rating_direction", { enum: ["forward", "reverse"] }).notNull(),
    audioEnabled: integer("audio_enabled", { mode: "boolean" }).notNull(),
    audioSide: text("audio_side", { enum: ["primary", "opposite"] }).notNull(),
    readingEnabled: integer("reading_enabled", { mode: "boolean" }).notNull(),
    readingSide: text("reading_side", { enum: ["primary", "opposite"] }).notNull(),
    hapticsEnabled: integer("haptics_enabled", { mode: "boolean" }).notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("learner_preferences_singleton_idx").on(sql`(1)`),
    check(
      "learner_preferences_color_mode_check",
      sql`${table.colorMode} IN ('light', 'dark', 'device')`
    ),
    check(
      "learner_preferences_study_island_position_check",
      sql`${table.studyIslandPosition} IN ('left', 'bottom', 'right')`
    ),
    check(
      "learner_preferences_rating_direction_check",
      sql`${table.ratingDirection} IN ('forward', 'reverse')`
    ),
    check("learner_preferences_audio_enabled_check", sql`${table.audioEnabled} IN (0, 1)`),
    check(
      "learner_preferences_audio_side_check",
      sql`${table.audioSide} IN ('primary', 'opposite')`
    ),
    check("learner_preferences_reading_enabled_check", sql`${table.readingEnabled} IN (0, 1)`),
    check(
      "learner_preferences_reading_side_check",
      sql`${table.readingSide} IN ('primary', 'opposite')`
    ),
    check("learner_preferences_haptics_enabled_check", sql`${table.hapticsEnabled} IN (0, 1)`),
  ]
);

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey().notNull(),
  authorId: text("author_id").notNull(),
  packageSchema: integer("package_schema").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverAsset: text("cover_asset").notNull().default("cards"),
  revision: integer("revision").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const dismissedBundledDecks = sqliteTable("dismissed_bundled_decks", {
  id: text("id").primaryKey().notNull(),
  deckId: text("deck_id").notNull().unique(),
});

export const deckThemeSelections = sqliteTable("deck_theme_selections", {
  id: text("id").primaryKey().notNull(),
  deckId: text("deck_id").notNull().unique(),
  theme: text("theme").notNull(),
});

export const flashcards = sqliteTable(
  "flashcards",
  {
    id: text("id").primaryKey().notNull(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    lessonId: text("lesson_id"),
    lessonSectionId: text("lesson_section_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("flashcards_order_check", sql`${table.order} >= 0`),
    index("flashcards_deck_id_idx").on(table.deckId),
    unique("flashcards_order_unique").on(table.deckId, table.order),
  ]
);

// Lessons are package content: they install, update, and uninstall with their deck.
export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey().notNull(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    check("lessons_order_check", sql`${table.order} >= 0`),
    index("lessons_deck_id_idx").on(table.deckId),
    unique("lessons_order_unique").on(table.deckId, table.order),
  ]
);

export const flashcardProgress = sqliteTable(
  "flashcard_progress",
  {
    id: text("id").primaryKey().notNull(),
    flashcardId: text("flashcard_id").notNull().unique(),
    deckId: text("deck_id").notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    againCount: integer("again_count").notNull().default(0),
    hardCount: integer("hard_count").notNull().default(0),
    goodCount: integer("good_count").notNull().default(0),
    easyCount: integer("easy_count").notNull().default(0),
    firstReviewedAt: text("first_reviewed_at"),
    lastReviewedAt: text("last_reviewed_at"),
    resetAt: text("reset_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("flashcard_progress_review_count_check", sql`${table.reviewCount} >= 0`),
    check("flashcard_progress_again_count_check", sql`${table.againCount} >= 0`),
    check("flashcard_progress_hard_count_check", sql`${table.hardCount} >= 0`),
    check("flashcard_progress_good_count_check", sql`${table.goodCount} >= 0`),
    check("flashcard_progress_easy_count_check", sql`${table.easyCount} >= 0`),
    check(
      "flashcard_progress_counter_sum_check",
      sql`${table.reviewCount} = ${table.againCount} + ${table.hardCount} + ${table.goodCount} + ${table.easyCount}`
    ),
    check(
      "flashcard_progress_reviewed_at_presence_check",
      sql`(${table.reviewCount} = 0 AND ${table.firstReviewedAt} IS NULL AND ${table.lastReviewedAt} IS NULL) OR (${table.reviewCount} > 0 AND ${table.firstReviewedAt} IS NOT NULL AND ${table.lastReviewedAt} IS NOT NULL)`
    ),
    check(
      "flashcard_progress_reviewed_at_order_check",
      sql`${table.firstReviewedAt} IS NULL OR ${table.lastReviewedAt} IS NULL OR ${table.firstReviewedAt} <= ${table.lastReviewedAt}`
    ),
    index("flashcard_progress_deck_id_idx").on(table.deckId),
    index("flashcard_progress_reset_at_idx").on(table.resetAt),
  ]
);

export const flashcardMemoryStates = sqliteTable(
  "flashcard_memory_states",
  {
    id: text("id").primaryKey().notNull(),
    flashcardId: text("flashcard_id").notNull().unique(),
    deckId: text("deck_id").notNull(),
    state: text("state", { enum: ["new", "learning", "review", "relearning"] }).notNull(),
    dueAt: text("due_at").notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    lastReviewAt: text("last_review_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("flashcard_memory_states_elapsed_days_check", sql`${table.elapsedDays} >= 0`),
    check("flashcard_memory_states_scheduled_days_check", sql`${table.scheduledDays} >= 0`),
    check("flashcard_memory_states_reps_check", sql`${table.reps} >= 0`),
    check("flashcard_memory_states_lapses_check", sql`${table.lapses} >= 0`),
    check("flashcard_memory_states_learning_steps_check", sql`${table.learningSteps} >= 0`),
    index("flashcard_memory_states_deck_id_idx").on(table.deckId),
  ]
);

export const flashcardReviewEvents = sqliteTable(
  "flashcard_review_events",
  {
    id: text("id").primaryKey().notNull(),
    deckId: text("deck_id").notNull(),
    flashcardId: text("flashcard_id").notNull(),
    rating: text("rating", { enum: ["again", "hard", "good", "easy"] }).notNull(),
    reviewedAt: text("reviewed_at").notNull(),
    committedAt: text("committed_at").notNull(),
  },
  (table) => [
    index("flashcard_review_events_deck_id_idx").on(table.deckId),
    index("flashcard_review_events_flashcard_id_idx").on(table.flashcardId),
  ]
);

export const deckProgress = sqliteTable("deck_progress", {
  id: text("id").primaryKey().notNull(),
  deckId: text("deck_id").notNull().unique(),
  title: text("title").notNull(),
  revision: integer("revision").notNull(),
  lastReviewedAt: text("last_reviewed_at").notNull(),
  status: text("status", { enum: ["active", "archived", "pending"] }).notNull(),
});

export const progressBackupState = sqliteTable("progress_backup_state", {
  id: integer("id").primaryKey(),
  safetyCopyFileName: text("safety_copy_file_name").notNull(),
});

export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: text("id").primaryKey().notNull(),
    scope: text("scope", { enum: ["discover", "focus"] }).notNull(),
    deckId: text("deck_id").references(() => decks.id, { onDelete: "cascade" }),
    currentReelPosition: integer("current_reel_position").notNull(),
    furthestReelPosition: integer("furthest_reel_position").notNull(),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
    aggregatedThroughReelPosition: integer("aggregated_through_reel_position")
      .notNull()
      .default(-1),
    lastActiveAt: text("last_active_at").notNull(),
    feedState: text("feed_state").notNull(),
  },
  (table) => [
    check(
      "study_sessions_scope_deck_check",
      sql`(${table.scope} = 'discover' AND ${table.deckId} IS NULL) OR (${table.scope} = 'focus' AND ${table.deckId} IS NOT NULL)`
    ),
    check("study_sessions_current_reel_position_check", sql`${table.currentReelPosition} >= 0`),
    check(
      "study_sessions_furthest_reel_position_check",
      sql`${table.furthestReelPosition} >= ${table.currentReelPosition}`
    ),
    check(
      "study_sessions_aggregated_through_reel_position_check",
      sql`${table.aggregatedThroughReelPosition} >= -1`
    ),
    index("study_sessions_active_scope_idx").on(
      table.scope,
      table.completedAt,
      table.deckId,
      table.createdAt,
      table.id
    ),
    uniqueIndex("study_sessions_one_active_per_scope_idx")
      .on(table.scope)
      .where(sql`${table.completedAt} IS NULL`),
  ]
);

export const studySessionReels = sqliteTable(
  "study_session_reels",
  {
    id: text("id").primaryKey().notNull(),
    studySessionId: text("study_session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    baseFeedPosition: integer("base_feed_position").notNull(),
    reelPosition: integer("reel_position").notNull(),
  },
  (table) => [
    check("study_session_reels_base_feed_position_check", sql`${table.baseFeedPosition} >= 0`),
    check("study_session_reels_reel_position_check", sql`${table.reelPosition} >= 0`),
    unique("study_session_reels_session_position_unique").on(
      table.studySessionId,
      table.baseFeedPosition
    ),
    unique("study_session_reels_session_reel_position_unique").on(
      table.studySessionId,
      table.reelPosition
    ),
    index("study_session_reels_flashcard_id_idx").on(table.flashcardId),
  ]
);

export const flashcardReviewAttempts = sqliteTable(
  "flashcard_review_attempts",
  {
    id: text("id").primaryKey().notNull(),
    studySessionId: text("study_session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    reelPosition: integer("reel_position").notNull(),
    rating: text("rating", { enum: ["again", "hard", "good", "easy"] }),
    createdAt: text("created_at").notNull(),
    ratedAt: text("rated_at"),
    updatedAt: text("updated_at").notNull(),
    committedAt: text("committed_at"),
  },
  (table) => [
    check("flashcard_review_attempts_reel_position_check", sql`${table.reelPosition} >= 0`),
    check(
      "flashcard_review_attempts_rating_check",
      sql`${table.rating} IS NULL OR ${table.rating} IN ('again', 'hard', 'good', 'easy')`
    ),
    check(
      "flashcard_review_attempts_rating_timestamp_check",
      sql`(${table.rating} IS NULL AND ${table.ratedAt} IS NULL) OR (${table.rating} IS NOT NULL AND ${table.ratedAt} IS NOT NULL)`
    ),
    unique("flashcard_review_attempts_session_reel_position_unique").on(
      table.studySessionId,
      table.reelPosition
    ),
    index("flashcard_review_attempts_flashcard_id_idx").on(table.flashcardId),
    index("flashcard_review_attempts_session_position_aggregation_idx").on(
      table.studySessionId,
      table.reelPosition,
      table.committedAt,
      table.rating,
      table.ratedAt
    ),
  ]
);

export const studySessionRecurrences = sqliteTable(
  "study_session_recurrences",
  {
    id: text("id").primaryKey().notNull(),
    studySessionId: text("study_session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    flashcardReviewAttemptId: text("flashcard_review_attempt_id")
      .notNull()
      .references(() => flashcardReviewAttempts.id, { onDelete: "cascade" }),
    targetReelPosition: integer("target_reel_position").notNull(),
    createdAt: text("created_at").notNull(),
    consumedAt: text("consumed_at"),
  },
  (table) => [
    check(
      "study_session_recurrences_target_reel_position_check",
      sql`${table.targetReelPosition} >= 0`
    ),
    index("study_session_recurrences_session_position_idx").on(
      table.studySessionId,
      table.targetReelPosition,
      table.createdAt,
      table.id
    ),
    index("study_session_recurrences_flashcard_id_idx").on(table.flashcardId),
    uniqueIndex("study_session_recurrences_pending_target_idx")
      .on(table.studySessionId, table.targetReelPosition)
      .where(sql`${table.consumedAt} IS NULL`),
    uniqueIndex("study_session_recurrences_pending_flashcard_review_attempt_idx")
      .on(table.flashcardReviewAttemptId)
      .where(sql`${table.consumedAt} IS NULL`),
  ]
);

export const databaseSchema = {
  learnerPreferences,
  progressBackupState,
  decks,
  dismissedBundledDecks,
  deckThemeSelections,
  flashcards,
  lessons,
  flashcardProgress,
  flashcardMemoryStates,
  flashcardReviewEvents,
  deckProgress,
  studySessions,
  studySessionReels,
  flashcardReviewAttempts,
  studySessionRecurrences,
};

export type DatabaseSchema = typeof databaseSchema;
