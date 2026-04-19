ALTER TABLE `children` ADD `pregnancyRefDate` timestamp;--> statement-breakpoint
ALTER TABLE `children` ADD `pregnancyWeeksAtRef` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `children` ADD `pregnancyDaysAtRef` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `children` ADD `isMultiple` boolean DEFAULT false;