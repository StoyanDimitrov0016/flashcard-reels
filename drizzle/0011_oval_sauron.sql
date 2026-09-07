PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flashcard_review_attempts` (
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
	CONSTRAINT "flashcard_review_attempts_reel_position_check" CHECK("__new_flashcard_review_attempts"."reel_position" >= 0),
	CONSTRAINT "flashcard_review_attempts_rating_check" CHECK("__new_flashcard_review_attempts"."rating" IS NULL OR "__new_flashcard_review_attempts"."rating" IN ('again', 'hard', 'good', 'easy')),
	CONSTRAINT "flashcard_review_attempts_rating_timestamp_check" CHECK(("__new_flashcard_review_attempts"."rating" IS NULL AND "__new_flashcard_review_attempts"."rated_at" IS NULL) OR ("__new_flashcard_review_attempts"."rating" IS NOT NULL AND "__new_flashcard_review_attempts"."rated_at" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_flashcard_review_attempts`("id", "study_session_id", "flashcard_id", "reel_position", "rating", "created_at", "rated_at", "updated_at", "finalized_at") SELECT "id", "study_session_id", "flashcard_id", "reel_position", "rating", "created_at", "rated_at", "updated_at", "finalized_at" FROM `flashcard_review_attempts`;--> statement-breakpoint
DROP TABLE `flashcard_review_attempts`;--> statement-breakpoint
ALTER TABLE `__new_flashcard_review_attempts` RENAME TO `flashcard_review_attempts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `review_attempts_flashcard_id_idx` ON `flashcard_review_attempts` (`flashcard_id`);--> statement-breakpoint
CREATE INDEX `review_attempts_session_position_aggregation_idx` ON `flashcard_review_attempts` (`study_session_id`,`reel_position`,`finalized_at`,`rating`,`rated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `review_attempts_session_reel_position_unique` ON `flashcard_review_attempts` (`study_session_id`,`reel_position`);--> statement-breakpoint
CREATE TABLE `__new_learner_profiles` (
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
	CONSTRAINT "learner_profiles_review_count_check" CHECK("__new_learner_profiles"."review_count" >= 0),
	CONSTRAINT "learner_profiles_again_count_check" CHECK("__new_learner_profiles"."again_count" >= 0),
	CONSTRAINT "learner_profiles_hard_count_check" CHECK("__new_learner_profiles"."hard_count" >= 0),
	CONSTRAINT "learner_profiles_good_count_check" CHECK("__new_learner_profiles"."good_count" >= 0),
	CONSTRAINT "learner_profiles_easy_count_check" CHECK("__new_learner_profiles"."easy_count" >= 0),
	CONSTRAINT "learner_profiles_counter_sum_check" CHECK("__new_learner_profiles"."review_count" = "__new_learner_profiles"."again_count" + "__new_learner_profiles"."hard_count" + "__new_learner_profiles"."good_count" + "__new_learner_profiles"."easy_count"),
	CONSTRAINT "learner_profiles_reviewed_at_presence_check" CHECK(("__new_learner_profiles"."review_count" = 0 AND "__new_learner_profiles"."first_reviewed_at" IS NULL AND "__new_learner_profiles"."last_reviewed_at" IS NULL) OR ("__new_learner_profiles"."review_count" > 0 AND "__new_learner_profiles"."first_reviewed_at" IS NOT NULL AND "__new_learner_profiles"."last_reviewed_at" IS NOT NULL)),
	CONSTRAINT "learner_profiles_reviewed_at_order_check" CHECK("__new_learner_profiles"."first_reviewed_at" IS NULL OR "__new_learner_profiles"."last_reviewed_at" IS NULL OR "__new_learner_profiles"."first_reviewed_at" <= "__new_learner_profiles"."last_reviewed_at")
);
--> statement-breakpoint
INSERT INTO `__new_learner_profiles`("flashcard_id", "review_count", "again_count", "hard_count", "good_count", "easy_count", "first_reviewed_at", "last_reviewed_at", "reset_at", "created_at", "updated_at") SELECT "flashcard_id", "review_count", "again_count", "hard_count", "good_count", "easy_count", "first_reviewed_at", "last_reviewed_at", "reset_at", "created_at", "updated_at" FROM `learner_profiles`;--> statement-breakpoint
DROP TABLE `learner_profiles`;--> statement-breakpoint
ALTER TABLE `__new_learner_profiles` RENAME TO `learner_profiles`;--> statement-breakpoint
CREATE INDEX `learner_profiles_reset_at_idx` ON `learner_profiles` (`reset_at`);