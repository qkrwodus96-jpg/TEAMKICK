ALTER TABLE `accounts` ADD `provider` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `kakao_id` text;--> statement-breakpoint
CREATE INDEX `idx_accounts_kakao` ON `accounts` (`kakao_id`);