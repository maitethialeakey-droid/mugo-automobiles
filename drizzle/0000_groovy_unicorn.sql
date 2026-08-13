CREATE TABLE `bulk_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`initiatedById` int NOT NULL,
	`fileName` varchar(320) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`bulk_import_status` enum('uploaded','validated','processed','failed') NOT NULL DEFAULT 'uploaded',
	`rowsReceived` int NOT NULL DEFAULT 0,
	`rowsImported` int NOT NULL DEFAULT 0,
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bulk_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_estimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`userId` int,
	`downPaymentKsh` int NOT NULL,
	`loanTermMonths` int NOT NULL,
	`annualRateBasisPoints` int NOT NULL,
	`estimatedMonthlyPaymentKsh` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finance_estimates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryId` int,
	`ownerId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`dueAt` timestamp NOT NULL,
	`reminder_status` enum('open','done','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int,
	`buyerId` int,
	`assignedToId` int,
	`contactName` varchar(160) NOT NULL,
	`contactEmail` varchar(320),
	`contactPhone` varchar(64),
	`message` text NOT NULL,
	`source` varchar(120),
	`inquiry_status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`nextFollowUpAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiry_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryId` int NOT NULL,
	`authorId` int,
	`message_author` enum('buyer','seller','system') NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inquiry_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`actorId` int,
	`order_status` enum('inquiry','reserved','paid','shipping','delivered','closed','cancelled','refunded') NOT NULL DEFAULT 'inquiry',
	`title` varchar(240) NOT NULL,
	`description` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`buyerId` int NOT NULL,
	`inquiryId` int,
	`order_status` enum('inquiry','reserved','paid','shipping','delivered','closed','cancelled','refunded') NOT NULL DEFAULT 'inquiry',
	`agreedPriceKsh` int NOT NULL,
	`customsStage` varchar(160),
	`deliveryReference` varchar(160),
	`cancellationReason` text,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`provider` varchar(80) NOT NULL,
	`providerReference` varchar(200),
	`amountKsh` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`payment_status` enum('pending','reconciled','failed','refunded') NOT NULL DEFAULT 'pending',
	`providerReportedAt` timestamp,
	`reconciledAt` timestamp,
	`reconciledById` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`filtersJson` text NOT NULL,
	`alertsEnabled` boolean NOT NULL DEFAULT true,
	`lastAlertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`savedPriceKsh` int NOT NULL,
	`priceDropAlerts` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_vehicles_user_vehicle_unique` UNIQUE(`userId`,`vehicleId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int,
	`uploadedById` int NOT NULL,
	`document_type` enum('invoice','receipt','bill_of_lading','logbook','registration','condition_report','auction_sheet','other') NOT NULL,
	`title` varchar(240) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`mimeType` varchar(120),
	`sizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`media_type` enum('image','video','walkaround') NOT NULL DEFAULT 'image',
	`caption` varchar(320),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isCover` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`viewerId` int,
	`source` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdById` int NOT NULL,
	`stockNumber` varchar(48) NOT NULL,
	`vin` varchar(64),
	`vehicle_status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`vehicle_availability` enum('available','reserved','sold') NOT NULL DEFAULT 'available',
	`make` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`trim` varchar(120),
	`year` int NOT NULL,
	`bodyType` varchar(80),
	`fuelType` varchar(80),
	`transmission` varchar(80),
	`mileageKm` int,
	`exteriorColor` varchar(80),
	`location` varchar(160),
	`priceKsh` int NOT NULL,
	`fobPriceKsh` int,
	`shippingCostKsh` int,
	`dutyCostKsh` int,
	`marginKsh` int,
	`description` text,
	`conditionSummary` text,
	`listedAt` timestamp,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_stockNumber_unique` UNIQUE(`stockNumber`)
);
--> statement-breakpoint
ALTER TABLE `bulk_imports` ADD CONSTRAINT `bulk_imports_initiatedById_users_id_fk` FOREIGN KEY (`initiatedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_estimates` ADD CONSTRAINT `finance_estimates_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `finance_estimates` ADD CONSTRAINT `finance_estimates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD CONSTRAINT `follow_up_reminders_inquiryId_inquiries_id_fk` FOREIGN KEY (`inquiryId`) REFERENCES `inquiries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD CONSTRAINT `follow_up_reminders_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_buyerId_users_id_fk` FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_assignedToId_users_id_fk` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiry_messages` ADD CONSTRAINT `inquiry_messages_inquiryId_inquiries_id_fk` FOREIGN KEY (`inquiryId`) REFERENCES `inquiries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiry_messages` ADD CONSTRAINT `inquiry_messages_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_buyerId_users_id_fk` FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_inquiryId_inquiries_id_fk` FOREIGN KEY (`inquiryId`) REFERENCES `inquiries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_reconciledById_users_id_fk` FOREIGN KEY (`reconciledById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_vehicles` ADD CONSTRAINT `saved_vehicles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_vehicles` ADD CONSTRAINT `saved_vehicles_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_documents` ADD CONSTRAINT `vehicle_documents_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_documents` ADD CONSTRAINT `vehicle_documents_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_media` ADD CONSTRAINT `vehicle_media_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_views` ADD CONSTRAINT `vehicle_views_vehicleId_vehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_views` ADD CONSTRAINT `vehicle_views_viewerId_users_id_fk` FOREIGN KEY (`viewerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`inquiry_status`,`nextFollowUpAt`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`order_status`);--> statement-breakpoint
CREATE INDEX `orders_buyer_idx` ON `orders` (`buyerId`);--> statement-breakpoint
CREATE INDEX `payments_status_provider_idx` ON `payments` (`payment_status`,`provider`);--> statement-breakpoint
CREATE INDEX `vehicle_documents_vehicle_idx` ON `vehicle_documents` (`vehicleId`,`document_type`);--> statement-breakpoint
CREATE INDEX `vehicle_media_vehicle_idx` ON `vehicle_media` (`vehicleId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `vehicle_views_vehicle_created_idx` ON `vehicle_views` (`vehicleId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `vehicles_status_idx` ON `vehicles` (`vehicle_status`);--> statement-breakpoint
CREATE INDEX `vehicles_availability_idx` ON `vehicles` (`vehicle_availability`);--> statement-breakpoint
CREATE INDEX `vehicles_make_model_idx` ON `vehicles` (`make`,`model`);