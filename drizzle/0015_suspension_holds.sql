ALTER TABLE `accounts` ADD `hold_until` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `hold_reason` text;--> statement-breakpoint
CREATE TABLE `suspension_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`until` text NOT NULL,
	`reason` text NOT NULL,
	`expires` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_suspension_holds_expires` ON `suspension_holds` (`expires`);
