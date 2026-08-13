import type { Request, Response } from "express";
import { getDb } from "./db";
import { scanMarketplaceAlerts } from "./routers/marketplace";
import { sdk } from "./_core/sdk";

export async function handleMarketplaceAlertScan(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database-unavailable" });
    const summary = await scanMarketplaceAlerts(db);
    return res.json({ ok: true, taskUid: user.taskUid, summary, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduled alert error";
    return res.status(500).json({ error: message, context: { path: "/api/scheduled/marketplace-alerts" }, timestamp: new Date().toISOString() });
  }
}
