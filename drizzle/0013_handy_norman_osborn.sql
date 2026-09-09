PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`position` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "flashcards_position_check" CHECK("__new_flashcards"."position" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_flashcards`("id", "deck_id", "position", "question", "answer", "created_at", "updated_at") SELECT "id", "deck_id", "deck_position", "question", "answer", "created_at", "updated_at" FROM `flashcards`;--> statement-breakpoint
DROP TABLE `flashcards`;--> statement-breakpoint
ALTER TABLE `__new_flashcards` RENAME TO `flashcards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `flashcards_deck_id_idx` ON `flashcards` (`deck_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `flashcards_position_unique` ON `flashcards` (`deck_id`,`position`);--> statement-breakpoint
ALTER TABLE `decks` ADD `version` integer DEFAULT 1 NOT NULL;
