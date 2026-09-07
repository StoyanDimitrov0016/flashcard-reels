import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const deckAppearances = sqliteTable("deck_appearances", {
  deckId: text("deck_id")
    .primaryKey()
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  accentColor: text("accent_color").notNull(),
  backgroundColor: text("background_color").notNull(),
});

export const flashcards = sqliteTable(
  "flashcards",
  {
    id: text("id").primaryKey().notNull(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    deckPosition: integer("deck_position").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("flashcards_deck_position_check", sql`${table.deckPosition} >= 0`),
    index("flashcards_deck_id_idx").on(table.deckId),
    unique("flashcards_deck_position_unique").on(table.deckId, table.deckPosition),
  ]
);

export const learnerProfiles = sqliteTable(
  "learner_profiles",
  {
    flashcardId: text("flashcard_id")
      .primaryKey()
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
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
    check("learner_profiles_review_count_check", sql`${table.reviewCount} >= 0`),
    check("learner_profiles_again_count_check", sql`${table.againCount} >= 0`),
    check("learner_profiles_hard_count_check", sql`${table.hardCount} >= 0`),
    check("learner_profiles_good_count_check", sql`${table.goodCount} >= 0`),
    check("learner_profiles_easy_count_check", sql`${table.easyCount} >= 0`),
    check(
      "learner_profiles_counter_sum_check",
      sql`${table.reviewCount} = ${table.againCount} + ${table.hardCount} + ${table.goodCount} + ${table.easyCount}`
    ),
    check(
      "learner_profiles_reviewed_at_order_check",
      sql`${table.firstReviewedAt} IS NULL OR ${table.lastReviewedAt} IS NULL OR ${table.firstReviewedAt} <= ${table.lastReviewedAt}`
    ),
    index("learner_profiles_reset_at_idx").on(table.resetAt),
  ]
);

export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: text("id").primaryKey().notNull(),
    scope: text("scope", { enum: ["mixed", "focused"] }).notNull(),
    strategy: text("strategy", { enum: ["shuffle", "ordered"] }).notNull(),
    deckId: text("deck_id").references(() => decks.id, { onDelete: "cascade" }),
    currentReelPosition: integer("current_reel_position").notNull(),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
    aggregatedThroughReelPosition: integer("aggregated_through_reel_position")
      .notNull()
      .default(-1),
    lastActiveAt: text("last_active_at").notNull(),
    strategyState: text("strategy_state").notNull(),
  },
  (table) => [
    check(
      "study_sessions_scope_deck_check",
      sql`(${table.scope} = 'mixed' AND ${table.deckId} IS NULL) OR (${table.scope} = 'focused' AND ${table.deckId} IS NOT NULL)`
    ),
    check("study_sessions_strategy_check", sql`${table.strategy} IN ('shuffle', 'ordered')`),
    check("study_sessions_current_reel_position_check", sql`${table.currentReelPosition} >= 0`),
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

export const studySessionItems = sqliteTable(
  "study_session_items",
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
    check("study_session_items_base_feed_position_check", sql`${table.baseFeedPosition} >= 0`),
    check("study_session_items_reel_position_check", sql`${table.reelPosition} >= 0`),
    unique("study_session_items_session_position_unique").on(
      table.studySessionId,
      table.baseFeedPosition
    ),
    unique("study_session_items_session_reel_position_unique").on(
      table.studySessionId,
      table.reelPosition
    ),
    index("study_session_items_flashcard_id_idx").on(table.flashcardId),
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
    finalizedAt: text("finalized_at"),
  },
  (table) => [
    check("flashcard_review_attempts_reel_position_check", sql`${table.reelPosition} >= 0`),
    check(
      "flashcard_review_attempts_rating_check",
      sql`${table.rating} IS NULL OR ${table.rating} IN ('again', 'hard', 'good', 'easy')`
    ),
    unique("review_attempts_session_reel_position_unique").on(
      table.studySessionId,
      table.reelPosition
    ),
    index("review_attempts_flashcard_id_idx").on(table.flashcardId),
    index("review_attempts_session_position_aggregation_idx").on(
      table.studySessionId,
      table.reelPosition,
      table.finalizedAt,
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
    sourceAttemptId: text("source_attempt_id")
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
    uniqueIndex("study_session_recurrences_pending_source_attempt_idx")
      .on(table.sourceAttemptId)
      .where(sql`${table.consumedAt} IS NULL`),
  ]
);

export const databaseSchema = {
  decks,
  deckAppearances,
  flashcards,
  learnerProfiles,
  studySessions,
  studySessionItems,
  flashcardReviewAttempts,
  studySessionRecurrences,
};

export type DatabaseSchema = typeof databaseSchema;
