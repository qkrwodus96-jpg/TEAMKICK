CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`scope` text,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_entities_kind_scope` ON `entities` (`kind`,`scope`);--> statement-breakpoint
CREATE TABLE `write_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`expected` integer NOT NULL,
	`actual` integer NOT NULL,
	CONSTRAINT "revision_matches" CHECK("write_guards"."expected" = "write_guards"."actual")
);
--> statement-breakpoint
CREATE TABLE `state_revision` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
