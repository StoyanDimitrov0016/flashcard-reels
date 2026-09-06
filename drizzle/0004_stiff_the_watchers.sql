PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_study_session_items` (
	`id` text PRIMARY KEY NOT NULL,
	`study_session_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`base_feed_position` integer NOT NULL,
	`reel_position` integer NOT NULL,
	FOREIGN KEY (`study_session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_session_items_base_feed_position_check" CHECK("__new_study_session_items"."base_feed_position" >= 0),
	CONSTRAINT "study_session_items_reel_position_check" CHECK("__new_study_session_items"."reel_position" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_study_session_items`("id", "study_session_id", "flashcard_id", "base_feed_position", "reel_position") SELECT "id", "study_session_id", "flashcard_id", "base_feed_position", "base_feed_position" FROM `study_session_items`;--> statement-breakpoint
DROP TABLE `study_session_items`;--> statement-breakpoint
ALTER TABLE `__new_study_session_items` RENAME TO `study_session_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `study_session_items_flashcard_id_idx` ON `study_session_items` (`flashcard_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_session_items_session_position_unique` ON `study_session_items` (`study_session_id`,`base_feed_position`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_session_items_session_reel_position_unique` ON `study_session_items` (`study_session_id`,`reel_position`);--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `strategy_state` text NOT NULL DEFAULT '{}';
