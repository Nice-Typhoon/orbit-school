CREATE TABLE `library` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL
);
