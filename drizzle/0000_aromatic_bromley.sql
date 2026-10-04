CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `answer` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	`correct` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_question_position_idx` ON `answer` (`question_id`,`position`);--> statement-breakpoint
CREATE TABLE `question` (
	`id` text PRIMARY KEY NOT NULL,
	`test_id` text NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `test`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_test_position_idx` ON `question` (`test_id`,`position`);--> statement-breakpoint
CREATE TABLE `test` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
