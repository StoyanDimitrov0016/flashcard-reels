PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`strategy` text NOT NULL,
	`deck_id` text,
	`current_reel_position` integer NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	`last_active_at` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_sessions_scope_deck_check" CHECK(("__new_study_sessions"."scope" = 'mixed' AND "__new_study_sessions"."deck_id" IS NULL) OR ("__new_study_sessions"."scope" = 'focused' AND "__new_study_sessions"."deck_id" IS NOT NULL)),
	CONSTRAINT "study_sessions_strategy_check" CHECK("__new_study_sessions"."strategy" IN ('shuffle', 'ordered')),
	CONSTRAINT "study_sessions_current_reel_position_check" CHECK("__new_study_sessions"."current_reel_position" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_study_sessions`("id", "scope", "strategy", "deck_id", "current_reel_position", "created_at", "completed_at", "last_active_at") SELECT "id", "scope", 'shuffle', "deck_id", "current_reel_position", "created_at", "completed_at", "last_active_at" FROM `study_sessions`;--> statement-breakpoint
DROP TABLE `study_sessions`;--> statement-breakpoint
ALTER TABLE `__new_study_sessions` RENAME TO `study_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `study_sessions_active_scope_idx` ON `study_sessions` (`scope`,`completed_at`,`deck_id`,`created_at`,`id`);
