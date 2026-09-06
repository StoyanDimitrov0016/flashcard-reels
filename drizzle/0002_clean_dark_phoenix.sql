ALTER TABLE `study_sessions` ADD `last_active_at` text NOT NULL DEFAULT '';
UPDATE `study_sessions` SET `last_active_at` = `created_at` WHERE `last_active_at` = '';
