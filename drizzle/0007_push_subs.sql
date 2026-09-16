CREATE TABLE `push_subs` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subs_endpoint_unique` ON `push_subs` (`endpoint`);--> statement-breakpoint
CREATE INDEX `idx_push_subs_account` ON `push_subs` (`account_id`);
