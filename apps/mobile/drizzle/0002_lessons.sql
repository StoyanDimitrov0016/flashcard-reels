CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lessons_order_check" CHECK("lessons"."order" >= 0)
);
--> statement-breakpoint
CREATE INDEX `lessons_deck_id_idx` ON `lessons` (`deck_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_order_unique` ON `lessons` (`deck_id`,`order`);