CREATE TABLE `user_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text,
	`dest` text,
	`read` integer DEFAULT 0 NOT NULL,
	`at` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_user_notifications_user_at` ON `user_notifications` (`user_id`,`at`);
--> statement-breakpoint
CREATE INDEX `idx_user_notifications_dest` ON `user_notifications` (`dest`);
