ALTER TABLE `connections` ADD `category` enum('life','work','family','kids','pets') DEFAULT 'life' NOT NULL;--> statement-breakpoint
ALTER TABLE `connections` ADD `hasUpdate` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `task_checkins` ADD `value` varchar(50);--> statement-breakpoint
ALTER TABLE `task_checkins` ADD `unit` varchar(20);