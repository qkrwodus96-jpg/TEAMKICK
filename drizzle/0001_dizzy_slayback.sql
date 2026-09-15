CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `sessions` (`account_id`);