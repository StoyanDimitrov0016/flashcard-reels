ALTER TABLE `flashcard_review_attempts` ADD `rated_at` text;
--> statement-breakpoint
UPDATE `flashcard_review_attempts`
SET `rated_at` = `updated_at`
WHERE `rating` IS NOT NULL;
