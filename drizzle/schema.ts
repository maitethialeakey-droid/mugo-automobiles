import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "inventory_manager", "sales_manager", "support_agent"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const vehicleStatus = mysqlEnum("vehicle_status", ["draft", "published", "archived"]);
export const vehicleAvailability = mysqlEnum("vehicle_availability", ["available", "reserved", "sold"]);
export const mediaType = mysqlEnum("media_type", ["image", "video", "walkaround"]);
export const inquiryStatus = mysqlEnum("inquiry_status", ["open", "in_progress", "closed"]);
export const messageAuthor = mysqlEnum("message_author", ["buyer", "seller", "system"]);
export const orderStatus = mysqlEnum("order_status", ["inquiry", "reserved", "paid", "shipping", "delivered", "closed", "cancelled", "refunded"]);
export const paymentStatus = mysqlEnum("payment_status", ["pending", "reconciled", "failed", "refunded"]);
export const paymentProvider = mysqlEnum("payment_provider", ["bank_transfer", "mpesa", "airtel_money", "paypal", "payoneer", "crypto"]);
export const paymentIntentStatus = mysqlEnum("payment_intent_status", ["draft", "pending", "requires_action", "authorized", "paid", "failed", "expired", "cancelled", "refunded"]);
export const documentType = mysqlEnum("document_type", ["invoice", "receipt", "bill_of_lading", "logbook", "registration", "condition_report", "auction_sheet", "other"]);
export const reminderStatus = mysqlEnum("reminder_status", ["open", "done", "dismissed"]);
export const notificationKind = mysqlEnum("notification_kind", ["aging_inventory", "price_drop", "saved_search", "follow_up"]);
export const notificationDeliveryChannel = mysqlEnum("notification_delivery_channel", ["email", "sms"]);
export const notificationDeliveryStatus = mysqlEnum("notification_delivery_status", ["pending", "sent", "failed", "skipped"]);

export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  createdById: int("createdById").notNull().references(() => users.id),
  stockNumber: varchar("stockNumber", { length: 48 }).notNull().unique(),
  vin: varchar("vin", { length: 64 }),
  status: vehicleStatus.default("draft").notNull(),
  availability: vehicleAvailability.default("available").notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  trim: varchar("trim", { length: 120 }),
  year: int("year").notNull(),
  bodyType: varchar("bodyType", { length: 80 }),
  fuelType: varchar("fuelType", { length: 80 }),
  transmission: varchar("transmission", { length: 80 }),
  mileageKm: int("mileageKm"),
  exteriorColor: varchar("exteriorColor", { length: 80 }),
  location: varchar("location", { length: 160 }),
  priceKsh: int("priceKsh").notNull(),
  fobPriceKsh: int("fobPriceKsh"),
  shippingCostKsh: int("shippingCostKsh"),
  dutyCostKsh: int("dutyCostKsh"),
  marginKsh: int("marginKsh"),
  description: text("description"),
  conditionSummary: text("conditionSummary"),
  listedAt: timestamp("listedAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("vehicles_status_idx").on(table.status),
  index("vehicles_availability_idx").on(table.availability),
  index("vehicles_make_model_idx").on(table.make, table.model),
]);

export const vehicleMedia = mysqlTable("vehicle_media", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  mediaType: mediaType.default("image").notNull(),
  caption: varchar("caption", { length: 320 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isCover: boolean("isCover").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("vehicle_media_vehicle_idx").on(table.vehicleId, table.sortOrder)]);

export const vehicleDocuments = mysqlTable("vehicle_documents", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").references(() => vehicles.id, { onDelete: "cascade" }),
  orderId: int("orderId").references(() => orders.id, { onDelete: "cascade" }),
  uploadedById: int("uploadedById").notNull().references(() => users.id),
  kind: documentType.notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  sizeBytes: int("sizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("vehicle_documents_vehicle_idx").on(table.vehicleId, table.kind)]);

export const bulkImports = mysqlTable("bulk_imports", {
  id: int("id").autoincrement().primaryKey(),
  initiatedById: int("initiatedById").notNull().references(() => users.id),
  fileName: varchar("fileName", { length: 320 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  status: mysqlEnum("bulk_import_status", ["uploaded", "validated", "processed", "failed"]).default("uploaded").notNull(),
  rowsReceived: int("rowsReceived").default(0).notNull(),
  rowsImported: int("rowsImported").default(0).notNull(),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const savedVehicles = mysqlTable("saved_vehicles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  vehicleId: int("vehicleId").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  savedPriceKsh: int("savedPriceKsh").notNull(),
  priceDropAlerts: boolean("priceDropAlerts").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("saved_vehicles_user_vehicle_unique").on(table.userId, table.vehicleId)]);

export const savedSearches = mysqlTable("saved_searches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  filtersJson: text("filtersJson").notNull(),
  alertsEnabled: boolean("alertsEnabled").default(true).notNull(),
  lastAlertedAt: timestamp("lastAlertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").references(() => vehicles.id, { onDelete: "set null" }),
  buyerId: int("buyerId").references(() => users.id, { onDelete: "set null" }),
  assignedToId: int("assignedToId").references(() => users.id, { onDelete: "set null" }),
  contactName: varchar("contactName", { length: 160 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 64 }),
  message: text("message").notNull(),
  source: varchar("source", { length: 120 }),
  status: inquiryStatus.default("open").notNull(),
  nextFollowUpAt: timestamp("nextFollowUpAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("inquiries_status_idx").on(table.status, table.nextFollowUpAt)]);

export const inquiryMessages = mysqlTable("inquiry_messages", {
  id: int("id").autoincrement().primaryKey(),
  inquiryId: int("inquiryId").notNull().references(() => inquiries.id, { onDelete: "cascade" }),
  authorId: int("authorId").references(() => users.id, { onDelete: "set null" }),
  authorType: messageAuthor.notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const followUpReminders = mysqlTable("follow_up_reminders", {
  id: int("id").autoincrement().primaryKey(),
  inquiryId: int("inquiryId").references(() => inquiries.id, { onDelete: "cascade" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  dueAt: timestamp("dueAt").notNull(),
  status: reminderStatus.default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: notificationKind.notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  href: varchar("href", { length: 512 }),
  referenceKey: varchar("referenceKey", { length: 320 }).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("notifications_user_reference_unique").on(table.userId, table.referenceKey), index("notifications_user_created_idx").on(table.userId, table.createdAt)]);

export const notificationDeliveries = mysqlTable("notification_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  channel: notificationDeliveryChannel.notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  provider: varchar("provider", { length: 80 }).notNull(),
  status: notificationDeliveryStatus.default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 240 }),
  errorMessage: text("errorMessage"),
  attemptedAt: timestamp("attemptedAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("notification_deliveries_unique").on(table.notificationId, table.channel, table.recipient), index("notification_deliveries_status_idx").on(table.status, table.updatedAt)]);

export const marketplaceSettings = mysqlTable("marketplace_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  alertScheduleTaskUid: varchar("alertScheduleTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull().references(() => vehicles.id),
  buyerId: int("buyerId").notNull().references(() => users.id),
  inquiryId: int("inquiryId").references(() => inquiries.id, { onDelete: "set null" }),
  status: orderStatus.default("inquiry").notNull(),
  agreedPriceKsh: int("agreedPriceKsh").notNull(),
  customsStage: varchar("customsStage", { length: 160 }),
  deliveryReference: varchar("deliveryReference", { length: 160 }),
  cancellationReason: text("cancellationReason"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("orders_status_idx").on(table.status), index("orders_buyer_idx").on(table.buyerId)]);

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 80 }).notNull(),
  providerReference: varchar("providerReference", { length: 200 }),
  amountKsh: int("amountKsh").notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  status: paymentStatus.default("pending").notNull(),
  providerReportedAt: timestamp("providerReportedAt"),
  reconciledAt: timestamp("reconciledAt"),
  reconciledById: int("reconciledById").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("payments_status_provider_idx").on(table.status, table.provider)]);

export const paymentIntents = mysqlTable("payment_intents", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: paymentProvider.notNull(),
  status: paymentIntentStatus.default("draft").notNull(),
  amountKsh: int("amountKsh").notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  reference: varchar("reference", { length: 200 }).notNull().unique(),
  checkoutUrl: varchar("checkoutUrl", { length: 1024 }),
  instructions: text("instructions"),
  expiresAt: timestamp("expiresAt"),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("payment_intents_order_status_idx").on(table.orderId, table.status), index("payment_intents_provider_status_idx").on(table.provider, table.status)]);

// Receipts are retained for audit and idempotency. Only signature-verified receipts may ever be promoted into a payment state transition.
export const paymentWebhookReceipts = mysqlTable("payment_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  provider: paymentProvider.notNull(),
  paymentId: int("paymentId").references(() => payments.id, { onDelete: "set null" }),
  providerEventId: varchar("providerEventId", { length: 240 }).notNull(),
  eventType: varchar("eventType", { length: 160 }),
  payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
  signatureVerified: boolean("signatureVerified").default(false).notNull(),
  processedAt: timestamp("processedAt"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("payment_webhook_provider_event_unique").on(table.provider, table.providerEventId), index("payment_webhook_processed_idx").on(table.provider, table.signatureVerified, table.receivedAt)]);

export const orderEvents = mysqlTable("order_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  actorId: int("actorId").references(() => users.id, { onDelete: "set null" }),
  status: orderStatus.notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

export const financeEstimates = mysqlTable("finance_estimates", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  downPaymentKsh: int("downPaymentKsh").notNull(),
  loanTermMonths: int("loanTermMonths").notNull(),
  annualRateBasisPoints: int("annualRateBasisPoints").notNull(),
  estimatedMonthlyPaymentKsh: int("estimatedMonthlyPaymentKsh").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const vehicleViews = mysqlTable("vehicle_views", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  viewerId: int("viewerId").references(() => users.id, { onDelete: "set null" }),
  source: varchar("source", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("vehicle_views_vehicle_created_idx").on(table.vehicleId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
