CREATE TABLE `attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`test_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_id`) REFERENCES `test`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempt_user_test_idx` ON `attempt` (`user_id`,`test_id`);--> statement-breakpoint
CREATE TABLE `attempt_question` (
	`attempt_id` text NOT NULL,
	`position` integer NOT NULL,
	`question_id` text NOT NULL,
	`answer_order` text NOT NULL,
	`selected_answer_ids` text,
	`correct` integer,
	`answered_at` integer,
	PRIMARY KEY(`attempt_id`, `position`),
	FOREIGN KEY (`attempt_id`) REFERENCES `attempt`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE cascade
);
