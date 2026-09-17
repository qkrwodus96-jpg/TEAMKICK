ALTER TABLE `accounts` ADD `provider_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_unique` ON `accounts` (`provider`,`provider_id`);
