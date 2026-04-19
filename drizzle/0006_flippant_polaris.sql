CREATE TABLE `event_join_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`requesterId` int NOT NULL,
	`hostId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_join_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `timeline_events` ADD `isPublic` boolean DEFAULT false NOT NULL;