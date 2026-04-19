ALTER TABLE `routine_tasks` ADD `taskType` enum('frequency','value') DEFAULT 'frequency';--> statement-breakpoint
ALTER TABLE `routine_tasks` ADD `valueUnit` varchar(30);