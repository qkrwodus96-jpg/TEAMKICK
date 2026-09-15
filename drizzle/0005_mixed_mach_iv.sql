CREATE TABLE `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_email_verifications_account` ON `email_verifications` (`account_id`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `verified_at` text;