CREATE TABLE `marketplace_settings` (
	`key` varchar(80) NOT NULL,
	`alertScheduleTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_settings_key` PRIMARY KEY(`key`)
);
