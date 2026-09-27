ALTER TABLE `deck_progress` RENAME COLUMN "version" TO "revision";--> statement-breakpoint
ALTER TABLE `decks` RENAME COLUMN "version" TO "revision";--> statement-breakpoint
ALTER TABLE `decks` ADD `author_id` text DEFAULT 'bf0b5aa7-18d6-4b36-aae9-5aa93f93235e' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `package_schema` integer DEFAULT 1 NOT NULL;