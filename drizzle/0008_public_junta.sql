CREATE TABLE `member_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`eventType` enum('birthday','anniversary','custom') NOT NULL DEFAULT 'custom',
	`eventDate` timestamp NOT NULL,
	`isYearly` boolean NOT NULL DEFAULT true,
	`note` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `children` ADD `childOneName` varchar(50);--> statement-breakpoint
ALTER TABLE `children` ADD `childTwoName` varchar(50);--> statement-breakpoint
ALTER TABLE `children` ADD `notes` text;