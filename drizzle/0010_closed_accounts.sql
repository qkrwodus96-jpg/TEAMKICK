CREATE TABLE `closed_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_closed_accounts_at` ON `closed_accounts` (`at`);
