CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_reset` ON `rate_limits` (`reset_at`);