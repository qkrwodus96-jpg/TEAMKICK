CREATE TABLE `social_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`subject` text NOT NULL,
	`name` text NOT NULL,
	`expires` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_social_signups_expires` ON `social_signups` (`expires`);
