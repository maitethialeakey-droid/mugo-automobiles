CREATE TABLE `payment_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`payment_provider` enum('bank_transfer','mpesa','airtel_money','paypal','payoneer','crypto') NOT NULL,
	`payment_intent_status` enum('draft','pending','requires_action','authorized','paid','failed','expired','cancelled','refunded') NOT NULL DEFAULT 'draft',
	`amountKsh` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`reference` varchar(200) NOT NULL,
	`checkoutUrl` varchar(1024),
	`instructions` text,
	`expiresAt` timestamp,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_intents_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_provider` enum('bank_transfer','mpesa','airtel_money','paypal','payoneer','crypto') NOT NULL,
	`paymentId` int,
	`providerEventId` varchar(240) NOT NULL,
	`eventType` varchar(160),
	`payloadHash` varchar(128) NOT NULL,
	`signatureVerified` boolean NOT NULL DEFAULT false,
	`processedAt` timestamp,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_webhook_provider_event_unique` UNIQUE(`payment_provider`,`providerEventId`)
);
--> statement-breakpoint
ALTER TABLE `payment_intents` ADD CONSTRAINT `payment_intents_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_intents` ADD CONSTRAINT `payment_intents_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_webhook_events` ADD CONSTRAINT `payment_webhook_events_paymentId_payments_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_intents_order_status_idx` ON `payment_intents` (`orderId`,`payment_intent_status`);--> statement-breakpoint
CREATE INDEX `payment_intents_provider_status_idx` ON `payment_intents` (`payment_provider`,`payment_intent_status`);--> statement-breakpoint
CREATE INDEX `payment_webhook_processed_idx` ON `payment_webhook_events` (`payment_provider`,`signatureVerified`,`receivedAt`);