CREATE TABLE `scope_revisions` (
	`scope` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schema_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`sig` text NOT NULL
);
