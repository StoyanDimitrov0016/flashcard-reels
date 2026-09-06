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
	CONSTRAINT "learner_profiles_reviewed_at_order_check" CHECK("learner_profiles"."first_reviewed_at" IS NULL OR "learner_profiles"."last_reviewed_at" IS NULL OR "learner_profiles"."first_reviewed_at" <= "learner_profiles"."last_reviewed_at")
);
--> statement-breakpoint
CREATE INDEX `learner_profiles_reset_at_idx` ON `learner_profiles` (`reset_at`);