CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`at` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_room_at` ON `chat_messages` (`room`,`at`);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_account` ON `chat_messages` (`account_id`);
--> statement-breakpoint
CREATE TABLE `chat_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`room` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_reads_account` ON `chat_reads` (`account_id`);
--> statement-breakpoint
CREATE TABLE `chat_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`room` text NOT NULL,
	`reporter` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`reason` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_reports_at` ON `chat_reports` (`at`);
