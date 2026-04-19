CREATE TABLE `children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`nickname` varchar(50) NOT NULL,
	`fullName` varchar(100),
	`gender` enum('girl','boy','unknown') DEFAULT 'unknown',
	`birthDate` timestamp,
	`avatarUrl` text,
	`color` varchar(20) DEFAULT '#FF6B6B',
	`embryoTransferDate` timestamp,
	`embryoDay` int DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `children_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`location` varchar(300),
	`locationLat` varchar(30),
	`locationLng` varchar(30),
	`coverUrl` text,
	`eventDate` timestamp NOT NULL,
	`inviteToken` varchar(32) NOT NULL,
	`isPublic` boolean DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_inviteToken_unique` UNIQUE(`inviteToken`)
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`coverUrl` text,
	`createdBy` int NOT NULL,
	`inviteCode` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `families_id` PRIMARY KEY(`id`),
	CONSTRAINT `families_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','collaborator','observer') NOT NULL DEFAULT 'observer',
	`nickname` varchar(50),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ageMonthMin` int NOT NULL,
	`ageMonthMax` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`category` enum('development','nutrition','vaccination','checkup','safety') NOT NULL,
	`isBuiltIn` boolean DEFAULT true,
	CONSTRAINT `milestone_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routine_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`childId` int,
	`title` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50) DEFAULT 'circle',
	`color` varchar(20) DEFAULT '#4ECDC4',
	`category` enum('feeding','sleep','checkup','play','bath','other') DEFAULT 'other',
	`repeatRule` varchar(100),
	`assignedTo` int,
	`isActive` boolean DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routine_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rsvps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`guestName` varchar(100) NOT NULL,
	`guestContact` varchar(200),
	`status` enum('attending','maybe','declined') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rsvps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`childId` int,
	`note` text,
	`checkedBy` int NOT NULL,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`familyId` int NOT NULL,
	`type` enum('pregnancy','milestone','post','checkup','vaccination','system') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text,
	`mediaUrls` text,
	`xiaohongshuUrl` text,
	`eventDate` timestamp NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timeline_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;