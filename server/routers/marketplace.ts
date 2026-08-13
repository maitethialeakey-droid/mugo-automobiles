import { and, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { z } from "zod";
import {
  bulkImports,
  financeEstimates,
  followUpReminders,
  inquiries,
  inquiryMessages,
  orderEvents,
  orders,
  payments,
  notifications,
  savedSearches,
  savedVehicles,
  vehicleDocuments,
  vehicleMedia,
  vehicleViews,
  vehicles,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const vehicleStatuses = ["draft", "published", "archived"] as const;
const vehicleAvailability = ["available", "reserved", "sold"] as const;
const orderStatuses = ["inquiry", "reserved", "paid", "shipping", "delivered", "closed", "cancelled", "refunded"] as const;

const vehicleInput = z.object({
  stockNumber: z.string().trim().min(3).max(48),
  vin: z.string().trim().max(64).optional().nullable(),
  make: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  trim: z.string().trim().max(120).optional().nullable(),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  bodyType: z.string().trim().max(80).optional().nullable(),
  fuelType: z.string().trim().max(80).optional().nullable(),
  transmission: z.string().trim().max(80).optional().nullable(),
  mileageKm: z.number().int().min(0).optional().nullable(),
  exteriorColor: z.string().trim().max(80).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  priceKsh: z.number().int().min(0),
  fobPriceKsh: z.number().int().min(0).optional().nullable(),
  shippingCostKsh: z.number().int().min(0).optional().nullable(),
  dutyCostKsh: z.number().int().min(0).optional().nullable(),
  marginKsh: z.number().int().min(0).optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  conditionSummary: z.string().trim().max(4000).optional().nullable(),
});

function calculateMonthlyPayment(principal: number, annualRateBasisPoints: number, months: number) {
  const monthlyRate = annualRateBasisPoints / 10000 / 12;
  if (monthlyRate === 0) return Math.round(principal / months);
  return Math.round((principal * monthlyRate * (1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1));
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Expected a base64 data URL");
  return { mimeType: match[1], bytes: Buffer.from(match[2], "base64") };
}

function normalizedRow(row: Record<string, unknown>) {
  const values = new Map(Object.entries(row).map(([key, value]) => [key.replace(/[^a-z0-9]/gi, "").toLowerCase(), value]));
  const read = (...keys: string[]) => keys.map((key) => values.get(key.replace(/[^a-z0-9]/gi, "").toLowerCase())).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  const number = (...keys: string[]) => {
    const value = read(...keys);
    const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  };
  const text = (...keys: string[]) => {
    const value = read(...keys);
    return value === undefined || value === null ? null : String(value).trim() || null;
  };
  return {
    stockNumber: text("stockNumber", "stock", "stockNo", "reference"), vin: text("vin", "chassis", "chassisNumber"), make: text("make", "brand"), model: text("model"), trim: text("trim", "grade", "variant"), year: number("year", "modelYear"), bodyType: text("bodyType", "body"), fuelType: text("fuelType", "fuel"), transmission: text("transmission", "gearbox"), mileageKm: number("mileageKm", "mileage", "odometer"), exteriorColor: text("exteriorColor", "color", "colour"), location: text("location"), priceKsh: number("priceKsh", "price", "askingPrice", "priceKes"), fobPriceKsh: number("fobPriceKsh", "fob"), shippingCostKsh: number("shippingCostKsh", "shipping"), dutyCostKsh: number("dutyCostKsh", "duty"), marginKsh: number("marginKsh", "margin"), description: text("description", "notes"), conditionSummary: text("conditionSummary", "condition"),
  };
}

async function buildOrderPdf(input: { orderId: number; vehicle: { make: string; model: string; year: number; stockNumber: string; vin: string | null; location: string | null; priceKsh: number }; buyer: { name: string | null; email: string | null }; kind: "invoice" | "receipt" }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const navy = rgb(0.06, 0.12, 0.29);
  const gold = rgb(0.86, 0.64, 0.03);
  const soft = rgb(0.42, 0.42, 0.39);
  const format = (value: number) => `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value)}`;
  page.drawRectangle({ x: 0, y: 765, width: 595.28, height: 76.89, color: navy });
  page.drawText("MUGO AUTOMOBILES", { x: 48, y: 804, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Motoring nirvana, considered.", { x: 49, y: 783, size: 9, font: regular, color: rgb(0.9, 0.9, 0.9) });
  page.drawText(input.kind === "invoice" ? "INVOICE" : "RECEIPT", { x: 48, y: 710, size: 27, font: bold, color: navy });
  page.drawText(`Order #${input.orderId}`, { x: 48, y: 686, size: 11, font: regular, color: gold });
  page.drawText(`Issued ${new Intl.DateTimeFormat("en-KE", { dateStyle: "long" }).format(new Date())}`, { x: 48, y: 662, size: 10, font: regular, color: soft });
  page.drawText("Billed to", { x: 48, y: 616, size: 10, font: bold, color: navy });
  page.drawText(input.buyer.name || "Buyer", { x: 48, y: 596, size: 13, font: bold, color: navy });
  page.drawText(input.buyer.email || "Email pending", { x: 48, y: 578, size: 10, font: regular, color: soft });
  page.drawRectangle({ x: 48, y: 400, width: 499, height: 142, color: rgb(0.97, 0.96, 0.92) });
  page.drawText("Vehicle", { x: 66, y: 514, size: 10, font: bold, color: gold });
  page.drawText(`${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`, { x: 66, y: 489, size: 17, font: bold, color: navy });
  page.drawText(`Stock ${input.vehicle.stockNumber}  ·  ${input.vehicle.location || "Location pending"}`, { x: 66, y: 466, size: 10, font: regular, color: soft });
  page.drawText(`VIN: ${input.vehicle.vin || "To be confirmed"}`, { x: 66, y: 446, size: 10, font: regular, color: soft });
  page.drawLine({ start: { x: 48, y: 365 }, end: { x: 547, y: 365 }, thickness: 1, color: rgb(0.85, 0.83, 0.78) });
  page.drawText("Vehicle price", { x: 48, y: 334, size: 11, font: regular, color: soft });
  page.drawText(format(input.vehicle.priceKsh), { x: 400, y: 332, size: 17, font: bold, color: navy });
  page.drawLine({ start: { x: 48, y: 306 }, end: { x: 547, y: 306 }, thickness: 1, color: rgb(0.85, 0.83, 0.78) });
  page.drawText("Total", { x: 48, y: 274, size: 14, font: bold, color: navy });
  page.drawText(format(input.vehicle.priceKsh), { x: 391, y: 271, size: 22, font: bold, color: navy });
  page.drawText("This document records the current agreed vehicle price. Payment reconciliation and delivery milestones are maintained in the buyer dashboard.", { x: 48, y: 175, size: 9, font: regular, color: soft, maxWidth: 470, lineHeight: 14 });
  page.drawText("Mugo Automobiles · Nairobi, Kenya", { x: 48, y: 78, size: 9, font: regular, color: soft });
  return pdf.save();
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function createNotification(db: Database, input: { userId: number; kind: "aging_inventory" | "price_drop" | "saved_search" | "follow_up"; title: string; body: string; href?: string; referenceKey: string }) {
  await db.insert(notifications).values(input).onDuplicateKeyUpdate({ set: { title: input.title, body: input.body, href: input.href ?? null, readAt: null } });
}

function searchMatchesVehicle(filtersJson: string, vehicle: { make: string; model: string; year: number; priceKsh: number }) {
  try {
    const filters = JSON.parse(filtersJson) as { make?: string; model?: string; minimumYear?: number; maxPriceKsh?: number };
    return (!filters.make || vehicle.make.toLowerCase() === filters.make.toLowerCase()) && (!filters.model || vehicle.model.toLowerCase().includes(filters.model.toLowerCase())) && (!filters.minimumYear || vehicle.year >= filters.minimumYear) && (!filters.maxPriceKsh || vehicle.priceKsh <= filters.maxPriceKsh);
  } catch {
    return false;
  }
}

export async function scanMarketplaceAlerts(db: Database) {
  const now = new Date();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);
  const [admins, agingVehicles, priceDrops, searches, recentlyPublished, dueReminders] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.role, "admin")),
    db.select().from(vehicles).where(and(eq(vehicles.status, "published"), eq(vehicles.availability, "available"), lt(vehicles.listedAt, sixtyDaysAgo))),
    db.select({ saved: savedVehicles, vehicle: vehicles }).from(savedVehicles).innerJoin(vehicles, eq(savedVehicles.vehicleId, vehicles.id)).where(and(eq(savedVehicles.priceDropAlerts, true), lt(vehicles.priceKsh, savedVehicles.savedPriceKsh))),
    db.select().from(savedSearches).where(eq(savedSearches.alertsEnabled, true)),
    db.select().from(vehicles).where(eq(vehicles.status, "published")).orderBy(desc(vehicles.publishedAt)).limit(50),
    db.select().from(followUpReminders).where(and(eq(followUpReminders.status, "open"), lte(followUpReminders.dueAt, now))),
  ]);

  let created = 0;
  for (const vehicle of agingVehicles) for (const admin of admins) {
    await createNotification(db, { userId: admin.id, kind: "aging_inventory", title: "Aging inventory needs review", body: `${vehicle.year} ${vehicle.make} ${vehicle.model} has been available for more than 60 days.`, href: "/admin/inventory", referenceKey: `aging:${vehicle.id}:${today}` });
    created += 1;
  }
  for (const row of priceDrops) {
    await createNotification(db, { userId: row.saved.userId, kind: "price_drop", title: "Saved vehicle price drop", body: `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model} is now listed below the price when it was saved.`, href: "/buyer", referenceKey: `price-drop:${row.saved.id}:${row.vehicle.priceKsh}` });
    created += 1;
  }
  for (const search of searches) {
    const match = recentlyPublished.find((vehicle) => (!search.lastAlertedAt || vehicle.publishedAt && vehicle.publishedAt > search.lastAlertedAt) && searchMatchesVehicle(search.filtersJson, vehicle));
    if (!match) continue;
    await createNotification(db, { userId: search.userId, kind: "saved_search", title: "A new vehicle matches your saved search", body: `${match.year} ${match.make} ${match.model} matches “${search.name}”.`, href: "/buyer", referenceKey: `saved-search:${search.id}:${match.id}` });
    await db.update(savedSearches).set({ lastAlertedAt: now }).where(eq(savedSearches.id, search.id));
    created += 1;
  }
  for (const reminder of dueReminders) {
    await createNotification(db, { userId: reminder.ownerId, kind: "follow_up", title: "Follow-up due", body: reminder.title, href: "/admin/customers", referenceKey: `follow-up:${reminder.id}` });
    created += 1;
  }
  return { created, aging: agingVehicles.length, priceDrops: priceDrops.length, searches: searches.length, followUps: dueReminders.length };
}

export const marketplaceRouter = router({
  vehicles: router({
    publicList: publicProcedure.input(z.object({ query: z.string().optional() }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(vehicles).where(and(eq(vehicles.status, "published"), eq(vehicles.availability, "available"))).orderBy(desc(vehicles.publishedAt));
      const media = rows.length ? await db.select().from(vehicleMedia).where(inArray(vehicleMedia.vehicleId, rows.map((vehicle) => vehicle.id))).orderBy(vehicleMedia.sortOrder) : [];
      const query = input?.query?.trim().toLowerCase();
      return rows.filter((vehicle) => !query || `${vehicle.make} ${vehicle.model} ${vehicle.trim ?? ""} ${vehicle.location ?? ""}`.toLowerCase().includes(query)).map((vehicle) => ({ ...vehicle, media: media.filter((item) => item.vehicleId === vehicle.id) }));
    }),
    adminList: adminProcedure.query(async () => {
      const db = await requireDb();
      const rows = await db.select().from(vehicles).orderBy(desc(vehicles.updatedAt));
      const media = rows.length ? await db.select().from(vehicleMedia).where(inArray(vehicleMedia.vehicleId, rows.map((vehicle) => vehicle.id))).orderBy(vehicleMedia.sortOrder) : [];
      return rows.map((vehicle) => ({ ...vehicle, media: media.filter((item) => item.vehicleId === vehicle.id) }));
    }),
    create: adminProcedure.input(vehicleInput.extend({ status: z.enum(vehicleStatuses).default("draft") })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = new Date();
      const published = input.status === "published";
      const result = await db.insert(vehicles).values({ ...input, createdById: ctx.user.id, listedAt: published ? now : null, publishedAt: published ? now : null });
      return { id: Number(result[0].insertId) };
    }),
    clone: adminProcedure.input(z.object({ vehicleId: z.number().int().positive(), stockNumber: z.string().trim().min(3).max(48) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const source = (await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1))[0];
      if (!source) throw new Error("Vehicle not found");
      const result = await db.insert(vehicles).values({
        createdById: ctx.user.id, stockNumber: input.stockNumber, vin: null, status: "draft", availability: "available", make: source.make, model: source.model, trim: source.trim, year: source.year, bodyType: source.bodyType, fuelType: source.fuelType, transmission: source.transmission, mileageKm: source.mileageKm, exteriorColor: source.exteriorColor, location: source.location, priceKsh: source.priceKsh, fobPriceKsh: source.fobPriceKsh, shippingCostKsh: source.shippingCostKsh, dutyCostKsh: source.dutyCostKsh, marginKsh: source.marginKsh, description: source.description, conditionSummary: source.conditionSummary,
      });
      return { id: Number(result[0].insertId) };
    }),
    updateStatus: adminProcedure.input(z.object({ vehicleId: z.number().int().positive(), status: z.enum(vehicleStatuses), availability: z.enum(vehicleAvailability).optional() })).mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date();
      await db.update(vehicles).set({ status: input.status, ...(input.availability ? { availability: input.availability } : {}), ...(input.status === "published" ? { publishedAt: now, listedAt: now } : {}) }).where(eq(vehicles.id, input.vehicleId));
      return { success: true };
    }),
    recordView: publicProcedure.input(z.object({ vehicleId: z.number().int().positive(), source: z.string().max(160).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(vehicleViews).values({ vehicleId: input.vehicleId, viewerId: ctx.user?.id ?? null, source: input.source ?? "direct" });
      return { success: true };
    }),
  }),
  uploads: router({
    upload: adminProcedure.input(z.object({ dataUrl: z.string().max(8_000_000), fileName: z.string().min(1).max(320), purpose: z.enum(["vehicle_media", "vehicle_document", "bulk_import"]), vehicleId: z.number().int().positive().optional(), documentKind: z.enum(["condition_report", "auction_sheet", "other"]).optional() })).mutation(async ({ ctx, input }) => {
      const { mimeType, bytes } = decodeDataUrl(input.dataUrl);
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const prefix = input.purpose === "vehicle_media" ? `vehicles/${input.vehicleId}/media` : input.purpose === "vehicle_document" ? `vehicles/${input.vehicleId}/documents` : `imports/${ctx.user.id}`;
      const uploaded = await storagePut(`${prefix}/${safeName}`, bytes, mimeType);
      const db = await requireDb();
      if (input.purpose === "vehicle_media") {
        if (!input.vehicleId) throw new Error("Vehicle required for media uploads");
        const existing = await db.select().from(vehicleMedia).where(eq(vehicleMedia.vehicleId, input.vehicleId));
        const result = await db.insert(vehicleMedia).values({ vehicleId: input.vehicleId, storageKey: uploaded.key, url: uploaded.url, mediaType: mimeType.startsWith("video/") ? "video" : "image", sortOrder: existing.length, isCover: existing.length === 0 });
        return { id: Number(result[0].insertId), ...uploaded };
      }
      if (input.purpose === "vehicle_document") {
        const result = await db.insert(vehicleDocuments).values({ vehicleId: input.vehicleId ?? null, uploadedById: ctx.user.id, kind: input.documentKind ?? "other", title: input.fileName, storageKey: uploaded.key, url: uploaded.url, mimeType, sizeBytes: bytes.length });
        return { id: Number(result[0].insertId), ...uploaded };
      }
      const importResult = await db.insert(bulkImports).values({ initiatedById: ctx.user.id, fileName: input.fileName, storageKey: uploaded.key, url: uploaded.url, status: "uploaded" });
      const importId = Number(importResult[0].insertId);
      try {
        const workbook = XLSX.read(bytes, { type: "buffer" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
        let imported = 0;
        const issues: string[] = [];
        for (let index = 0; index < rows.length; index += 1) {
          const rawRow = rows[index];
          const row = normalizedRow(rawRow);
          if (!row.stockNumber || !row.make || !row.model || !row.year || !row.priceKsh) {
            issues.push(`Row ${index + 2}: stock number, make, model, year, and price are required.`);
            continue;
          }
          try {
            await db.insert(vehicles).values({ ...row, stockNumber: row.stockNumber, make: row.make, model: row.model, year: row.year, priceKsh: row.priceKsh, createdById: ctx.user.id, status: "draft", availability: "available" });
            imported += 1;
          } catch {
            issues.push(`Row ${index + 2}: skipped because the stock number already exists or the record is invalid.`);
          }
        }
        await db.update(bulkImports).set({ status: issues.length ? "validated" : "processed", rowsReceived: rows.length, rowsImported: imported, summary: issues.length ? issues.slice(0, 20).join("\n") : "All rows were imported as drafts." }).where(eq(bulkImports.id, importId));
        return { id: importId, ...uploaded, rowsReceived: rows.length, rowsImported: imported, issues };
      } catch (error) {
        await db.update(bulkImports).set({ status: "failed", summary: error instanceof Error ? error.message : "Could not read spreadsheet" }).where(eq(bulkImports.id, importId));
        throw new Error("The file was stored, but its spreadsheet rows could not be read.");
      }
    }),
    reorderMedia: adminProcedure.input(z.object({ vehicleId: z.number().int().positive(), mediaIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ input }) => {
      const db = await requireDb();
      await Promise.all(input.mediaIds.map((id, index) => db.update(vehicleMedia).set({ sortOrder: index, isCover: index === 0 }).where(and(eq(vehicleMedia.id, id), eq(vehicleMedia.vehicleId, input.vehicleId)))));
      return { success: true };
    }),
  }),
  buyer: router({
    saveVehicle: protectedProcedure.input(z.object({ vehicleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1))[0];
      if (!vehicle) throw new Error("Vehicle not found");
      await db.insert(savedVehicles).values({ userId: ctx.user.id, vehicleId: input.vehicleId, savedPriceKsh: vehicle.priceKsh }).onDuplicateKeyUpdate({ set: { priceDropAlerts: true } });
      return { success: true };
    }),
    unsaveVehicle: protectedProcedure.input(z.object({ vehicleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(savedVehicles).where(and(eq(savedVehicles.userId, ctx.user.id), eq(savedVehicles.vehicleId, input.vehicleId)));
      return { success: true };
    }),
    saved: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({ savedAt: savedVehicles.createdAt, savedPriceKsh: savedVehicles.savedPriceKsh, priceDropAlerts: savedVehicles.priceDropAlerts, vehicle: vehicles }).from(savedVehicles).innerJoin(vehicles, eq(savedVehicles.vehicleId, vehicles.id)).where(eq(savedVehicles.userId, ctx.user.id));
    }),
    savedSearches: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(savedSearches).where(eq(savedSearches.userId, ctx.user.id)).orderBy(desc(savedSearches.createdAt));
    }),
    createSavedSearch: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160), filtersJson: z.string().min(2).max(4000) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(savedSearches).values({ userId: ctx.user.id, ...input });
      return { success: true };
    }),
    orders: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({ order: orders, vehicle: vehicles }).from(orders).innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).where(eq(orders.buyerId, ctx.user.id)).orderBy(desc(orders.updatedAt));
    }),
    inquiryHistory: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({ inquiry: inquiries, vehicle: vehicles }).from(inquiries).leftJoin(vehicles, eq(inquiries.vehicleId, vehicles.id)).where(eq(inquiries.buyerId, ctx.user.id)).orderBy(desc(inquiries.updatedAt));
    }),
    documents: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({ document: vehicleDocuments, vehicle: vehicles, order: orders }).from(orders).innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).innerJoin(vehicleDocuments, eq(vehicleDocuments.orderId, orders.id)).where(eq(orders.buyerId, ctx.user.id)).orderBy(desc(vehicleDocuments.createdAt));
    }),
    orderEvents: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const order = (await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.buyerId, ctx.user.id))).limit(1))[0];
      if (!order) throw new Error("Order not found");
      return db.select().from(orderEvents).where(eq(orderEvents.orderId, input.orderId)).orderBy(desc(orderEvents.occurredAt));
    }),
    updateSavedSearch: protectedProcedure.input(z.object({ id: z.number().int().positive(), alertsEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(savedSearches).set({ alertsEnabled: input.alertsEnabled }).where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, ctx.user.id)));
      return { success: true };
    }),
    removeSavedSearch: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(savedSearches).where(and(eq(savedSearches.id, input.id), eq(savedSearches.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  inquiries: router({
    create: publicProcedure.input(z.object({ vehicleId: z.number().int().positive().optional(), contactName: z.string().trim().min(2).max(160), contactEmail: z.string().email().optional(), contactPhone: z.string().max(64).optional(), message: z.string().trim().min(4).max(4000), source: z.string().max(120).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.insert(inquiries).values({ ...input, buyerId: ctx.user?.id ?? null, status: "open" });
      return { id: Number(result[0].insertId) };
    }),
    adminList: adminProcedure.query(async () => {
      const db = await requireDb();
      return db.select({ inquiry: inquiries, vehicle: vehicles }).from(inquiries).leftJoin(vehicles, eq(inquiries.vehicleId, vehicles.id)).orderBy(desc(inquiries.updatedAt));
    }),
    addMessage: protectedProcedure.input(z.object({ inquiryId: z.number().int().positive(), body: z.string().trim().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const inquiry = (await db.select().from(inquiries).where(eq(inquiries.id, input.inquiryId)).limit(1))[0];
      if (!inquiry || (ctx.user.role !== "admin" && inquiry.buyerId !== ctx.user.id)) throw new Error("Not permitted to message this inquiry");
      await db.insert(inquiryMessages).values({ inquiryId: input.inquiryId, authorId: ctx.user.id, authorType: ctx.user.role === "admin" ? "seller" : "buyer", body: input.body });
      await db.update(inquiries).set({ status: "in_progress" }).where(eq(inquiries.id, input.inquiryId));
      return { success: true };
    }),
  }),
  orders: router({
    create: adminProcedure.input(z.object({ vehicleId: z.number().int().positive(), buyerId: z.number().int().positive(), inquiryId: z.number().int().positive().optional(), agreedPriceKsh: z.number().int().min(0) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.insert(orders).values({ ...input, status: "reserved" });
      const orderId = Number(result[0].insertId);
      await db.insert(orderEvents).values({ orderId, actorId: ctx.user.id, status: "reserved", title: "Vehicle reserved", description: "The reservation has been created and is awaiting payment." });
      await db.update(vehicles).set({ availability: "reserved" }).where(eq(vehicles.id, input.vehicleId));
      return { id: orderId };
    }),
    adminList: adminProcedure.query(async () => {
      const db = await requireDb();
      const rows = await db.select({ order: orders, vehicle: vehicles, payment: payments }).from(orders).innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).leftJoin(payments, eq(payments.orderId, orders.id)).orderBy(desc(orders.updatedAt));
      return rows as Array<(typeof rows)[number] & { payment: NonNullable<(typeof rows)[number]["payment"]> }>;
    }),
    updateStatus: adminProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(orderStatuses), cancellationReason: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(orders).set({ status: input.status, ...(input.status === "cancelled" ? { cancellationReason: input.cancellationReason ?? "Cancelled by seller", cancelledAt: new Date() } : {}) }).where(eq(orders.id, input.orderId));
      await db.insert(orderEvents).values({ orderId: input.orderId, actorId: ctx.user.id, status: input.status, title: input.status === "cancelled" ? "Order cancelled" : input.status === "refunded" ? "Refund recorded" : `Order moved to ${input.status}`, description: input.cancellationReason ?? null });
      return { success: true };
    }),
    reconcilePayment: adminProcedure.input(z.object({ paymentId: z.number().int().positive(), status: z.enum(["reconciled", "failed", "refunded"]), notes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(payments).set({ status: input.status, notes: input.notes ?? null, reconciledAt: new Date(), reconciledById: ctx.user.id }).where(eq(payments.id, input.paymentId));
      return { success: true };
    }),
    generateDocument: adminProcedure.input(z.object({ orderId: z.number().int().positive(), kind: z.enum(["invoice", "receipt"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const row = (await db.select({ order: orders, vehicle: vehicles, buyer: users }).from(orders).innerJoin(vehicles, eq(orders.vehicleId, vehicles.id)).innerJoin(users, eq(orders.buyerId, users.id)).where(eq(orders.id, input.orderId)).limit(1))[0];
      if (!row) throw new Error("Order not found");
      const bytes = await buildOrderPdf({ orderId: row.order.id, vehicle: row.vehicle, buyer: row.buyer, kind: input.kind });
      const uploaded = await storagePut(`orders/${row.order.id}/${input.kind}-${row.order.id}.pdf`, bytes, "application/pdf");
      const result = await db.insert(vehicleDocuments).values({ vehicleId: row.vehicle.id, orderId: row.order.id, uploadedById: ctx.user.id, kind: input.kind, title: `${input.kind === "invoice" ? "Invoice" : "Receipt"} · Order #${row.order.id}`, storageKey: uploaded.key, url: uploaded.url, mimeType: "application/pdf", sizeBytes: bytes.length });
      return { id: Number(result[0].insertId), ...uploaded };
    }),
  }),
  finance: router({
    estimate: publicProcedure.input(z.object({ vehicleId: z.number().int().positive(), downPaymentKsh: z.number().int().min(0), loanTermMonths: z.number().int().min(6).max(84), annualRateBasisPoints: z.number().int().min(0).max(5000) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1))[0];
      if (!vehicle) throw new Error("Vehicle not found");
      const principal = Math.max(0, vehicle.priceKsh - input.downPaymentKsh);
      const estimatedMonthlyPaymentKsh = calculateMonthlyPayment(principal, input.annualRateBasisPoints, input.loanTermMonths);
      await db.insert(financeEstimates).values({ ...input, userId: ctx.user?.id ?? null, estimatedMonthlyPaymentKsh });
      return { principal, estimatedMonthlyPaymentKsh };
    }),
  }),
  alerts: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(50);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  admin: router({
    summary: adminProcedure.query(async () => {
      const db = await requireDb();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const [inventoryCounts, aging, openInquiries, pipeline, totals] = await Promise.all([
        db.select({ status: vehicles.status, count: sql<number>`count(*)` }).from(vehicles).groupBy(vehicles.status),
        db.select().from(vehicles).where(and(eq(vehicles.status, "published"), lt(vehicles.listedAt, sixtyDaysAgo), eq(vehicles.availability, "available"))),
        db.select({ count: sql<number>`count(*)` }).from(inquiries).where(inArray(inquiries.status, ["open", "in_progress"])),
        db.select({ status: orders.status, count: sql<number>`count(*)` }).from(orders).groupBy(orders.status),
        db.select({ revenue: sql<number>`coalesce(sum(case when ${payments.status} = 'reconciled' then ${payments.amountKsh} else 0 end), 0)` }).from(payments),
      ]);
      return { inventoryCounts, agingInventory: aging, openInquiryCount: Number(openInquiries[0]?.count ?? 0), pipeline, reconciledRevenueKsh: Number(totals[0]?.revenue ?? 0) };
    }),
    reminders: adminProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(followUpReminders).where(and(eq(followUpReminders.status, "open"), gte(followUpReminders.dueAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))).orderBy(followUpReminders.dueAt);
    }),
    runAlertScan: adminProcedure.mutation(async () => {
      const db = await requireDb();
      return scanMarketplaceAlerts(db);
    }),
  }),
});
