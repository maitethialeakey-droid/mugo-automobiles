CREATE TABLE `notification_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` int NOT NULL,
	`notification_delivery_channel` enum('email','sms') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`provider` varchar(80) NOT NULL,
	`notification_delivery_status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`providerMessageId` varchar(240),
	`errorMessage` text,
	`attemptedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_deliveries_unique` UNIQUE(`notificationId`,`notification_delivery_channel`,`recipient`)
);
--> statement-breakpoint
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `notification_deliveries_notificationId_notifications_id_fk` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notification_deliveries_status_idx` ON `notification_deliveries` (`notification_delivery_status`,`updatedAt`);