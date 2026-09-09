CREATE TABLE `deck_appearances` (
	`deck_id` text PRIMARY KEY NOT NULL,
	`accent_color` text NOT NULL,
	`background_color` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_asset` text DEFAULT 'cards' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flashcard_review_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`study_session_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`reel_position` integer NOT NULL,
	`rating` text,
	`created_at` text NOT NULL,
	`rated_at` text,
	`updated_at` text NOT NULL,
	`finalized_at` text,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "flashcard_review_attempts_reel_position_check" CHECK("flashcard_review_attempts"."reel_position" >= 0),
	CONSTRAINT "flashcard_review_attempts_rating_check" CHECK("flashcard_review_attempts"."rating" IS NULL OR "flashcard_review_attempts"."rating" IN ('again', 'hard', 'good', 'easy')),
	CONSTRAINT "flashcard_review_attempts_rating_timestamp_check" CHECK(("flashcard_review_attempts"."rating" IS NULL AND "flashcard_review_attempts"."rated_at" IS NULL) OR ("flashcard_review_attempts"."rating" IS NOT NULL AND "flashcard_review_attempts"."rated_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `review_attempts_flashcard_id_idx` ON `flashcard_review_attempts` (`flashcard_id`);--> statement-breakpoint
CREATE INDEX `review_attempts_session_position_aggregation_idx` ON `flashcard_review_attempts` (`study_session_id`,`reel_position`,`finalized_at`,`rating`,`rated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `review_attempts_session_reel_position_unique` ON `flashcard_review_attempts` (`study_session_id`,`reel_position`);--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`order` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "flashcards_order_check" CHECK("flashcards"."order" >= 0)
);
--> statement-breakpoint
CREATE INDEX `flashcards_deck_id_idx` ON `flashcards` (`deck_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `flashcards_order_unique` ON `flashcards` (`deck_id`,`order`);--> statement-breakpoint
CREATE TABLE `learner_profiles` (
	`flashcard_id` text PRIMARY KEY NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`again_count` integer DEFAULT 0 NOT NULL,
	`hard_count` integer DEFAULT 0 NOT NULL,
	`good_count` integer DEFAULT 0 NOT NULL,
	`easy_count` integer DEFAULT 0 NOT NULL,
	`first_reviewed_at` text,
	`last_reviewed_at` text,
	`reset_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "learner_profiles_review_count_check" CHECK("learner_profiles"."review_count" >= 0),
	CONSTRAINT "learner_profiles_again_count_check" CHECK("learner_profiles"."again_count" >= 0),
	CONSTRAINT "learner_profiles_hard_count_check" CHECK("learner_profiles"."hard_count" >= 0),
	CONSTRAINT "learner_profiles_good_count_check" CHECK("learner_profiles"."good_count" >= 0),
	CONSTRAINT "learner_profiles_easy_count_check" CHECK("learner_profiles"."easy_count" >= 0),
	CONSTRAINT "learner_profiles_counter_sum_check" CHECK("learner_profiles"."review_count" = "learner_profiles"."again_count" + "learner_profiles"."hard_count" + "learner_profiles"."good_count" + "learner_profiles"."easy_count"),
	CONSTRAINT "learner_profiles_reviewed_at_presence_check" CHECK(("learner_profiles"."review_count" = 0 AND "learner_profiles"."first_reviewed_at" IS NULL AND "learner_profiles"."last_reviewed_at" IS NULL) OR ("learner_profiles"."review_count" > 0 AND "learner_profiles"."first_reviewed_at" IS NOT NULL AND "learner_profiles"."last_reviewed_at" IS NOT NULL)),
	CONSTRAINT "learner_profiles_reviewed_at_order_check" CHECK("learner_profiles"."first_reviewed_at" IS NULL OR "learner_profiles"."last_reviewed_at" IS NULL OR "learner_profiles"."first_reviewed_at" <= "learner_profiles"."last_reviewed_at")
);
--> statement-breakpoint
CREATE INDEX `learner_profiles_reset_at_idx` ON `learner_profiles` (`reset_at`);--> statement-breakpoint
CREATE TABLE `study_session_items` (
	`id` text PRIMARY KEY NOT NULL,
	`study_session_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`base_feed_position` integer NOT NULL,
	`reel_position` integer NOT NULL,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_session_items_base_feed_position_check" CHECK("study_session_items"."base_feed_position" >= 0),
	CONSTRAINT "study_session_items_reel_position_check" CHECK("study_session_items"."reel_position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `study_session_items_flashcard_id_idx` ON `study_session_items` (`flashcard_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_session_items_session_position_unique` ON `study_session_items` (`study_session_id`,`base_feed_position`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_session_items_session_reel_position_unique` ON `study_session_items` (`study_session_id`,`reel_position`);--> statement-breakpoint
CREATE TABLE `study_session_recurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`study_session_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`source_attempt_id` text NOT NULL,
	`target_reel_position` integer NOT NULL,
	`created_at` text NOT NULL,
	`consumed_at` text,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_attempt_id`) REFERENCES `flashcard_review_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_session_recurrences_target_reel_position_check" CHECK("study_session_recurrences"."target_reel_position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `study_session_recurrences_session_position_idx` ON `study_session_recurrences` (`study_session_id`,`target_reel_position`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `study_session_recurrences_flashcard_id_idx` ON `study_session_recurrences` (`flashcard_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_session_recurrences_pending_target_idx` ON `study_session_recurrences` (`study_session_id`,`target_reel_position`) WHERE "study_session_recurrences"."consumed_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `study_session_recurrences_pending_source_attempt_idx` ON `study_session_recurrences` (`source_attempt_id`) WHERE "study_session_recurrences"."consumed_at" IS NULL;--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`strategy` text NOT NULL,
	`deck_id` text,
	`current_reel_position` integer NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	`aggregated_through_reel_position` integer DEFAULT -1 NOT NULL,
	`last_active_at` text NOT NULL,
	`strategy_state` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_sessions_scope_deck_check" CHECK(("study_sessions"."scope" = 'mixed' AND "study_sessions"."deck_id" IS NULL) OR ("study_sessions"."scope" = 'focused' AND "study_sessions"."deck_id" IS NOT NULL)),
	CONSTRAINT "study_sessions_strategy_check" CHECK("study_sessions"."strategy" IN ('shuffle', 'ordered')),
	CONSTRAINT "study_sessions_current_reel_position_check" CHECK("study_sessions"."current_reel_position" >= 0),
	CONSTRAINT "study_sessions_aggregated_through_reel_position_check" CHECK("study_sessions"."aggregated_through_reel_position" >= -1)
);
--> statement-breakpoint
CREATE INDEX `study_sessions_active_scope_idx` ON `study_sessions` (`scope`,`completed_at`,`deck_id`,`created_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_sessions_one_active_per_scope_idx` ON `study_sessions` (`scope`) WHERE "study_sessions"."completed_at" IS NULL;