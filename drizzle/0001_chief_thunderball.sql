PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`deck_position` integer NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "flashcards_deck_position_check" CHECK("__new_flashcards"."deck_position" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_flashcards`("id", "deck_id", "deck_position", "question", "answer", "created_at", "updated_at")
SELECT current."id", current."deck_id",
  (
    SELECT COUNT(*) - 1
    FROM `flashcards` earlier
    WHERE earlier."deck_id" = current."deck_id"
      AND (
        earlier."created_at" < current."created_at"
        OR (
          earlier."created_at" = current."created_at"
          AND earlier."id" <= current."id"
        )
      )
  ),
  current."question", current."answer", current."created_at", current."updated_at"
FROM `flashcards` current;--> statement-breakpoint
DROP TABLE `flashcards`;--> statement-breakpoint
ALTER TABLE `__new_flashcards` RENAME TO `flashcards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `flashcards_deck_id_idx` ON `flashcards` (`deck_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `flashcards_deck_position_unique` ON `flashcards` (`deck_id`,`deck_position`);
