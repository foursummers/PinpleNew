CREATE TABLE `event_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_images_id` PRIMARY KEY(`id`)
);
