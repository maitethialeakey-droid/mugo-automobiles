import { and, desc, eq } from "drizzle-orm";
import { notificationDeliveries, notifications, users } from "../drizzle/schema";
import { getDb } from "./db";

type MarketplaceDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>;

export type AlertDeliveryConfig = {
  sendGridApiKey: string;
  sendGridFromEmail: string;
  africasTalkingUsername: string;
  africasTalkingApiKey: string;
  africasTalkingSenderId: string;
  ownerSmsRecipient: string;
};

export function getAlertDeliveryConfig(env: NodeJS.ProcessEnv = process.env): AlertDeliveryConfig {
  return {
    sendGridApiKey: env.SENDGRID_API_KEY?.trim() ?? "",
    sendGridFromEmail: env.SENDGRID_FROM_EMAIL?.trim() ?? "",
    africasTalkingUsername: env.AFRICASTALKING_USERNAME?.trim() ?? "",
    africasTalkingApiKey: env.AFRICASTALKING_API_KEY?.trim() ?? "",
    africasTalkingSenderId: env.AFRICASTALKING_SENDER_ID?.trim() ?? "",
    ownerSmsRecipient: env.MUGO_ALERT_SMS_TO?.trim() ?? "",
  };
}

export function hasEmailDelivery(config: AlertDeliveryConfig) {
  return Boolean(config.sendGridApiKey && config.sendGridFromEmail);
}

export function hasSmsDelivery(config: AlertDeliveryConfig) {
  return Boolean(config.africasTalkingUsername && config.africasTalkingApiKey && config.africasTalkingSenderId && config.ownerSmsRecipient);
}

export async function sendAlertEmail(input: { to: string; subject: string; text: string }, config: AlertDeliveryConfig, fetchImpl: FetchLike = fetch) {
  if (!hasEmailDelivery(config)) return { status: "skipped" as const, error: "SendGrid is not configured" };
  const response = await fetchImpl("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.sendGridApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ personalizations: [{ to: [{ email: input.to }] }], from: { email: config.sendGridFromEmail, name: "Mugo Automobiles" }, subject: input.subject, content: [{ type: "text/plain", value: input.text }] }),
  });
  if (!response.ok) return { status: "failed" as const, error: `SendGrid ${response.status}: ${(await response.text()).slice(0, 500)}` };
  return { status: "sent" as const, providerMessageId: undefined };
}

export async function sendAlertSms(input: { to: string; text: string }, config: AlertDeliveryConfig, fetchImpl: FetchLike = fetch) {
  if (!hasSmsDelivery(config)) return { status: "skipped" as const, error: "Africa's Talking is not configured" };
  const response = await fetchImpl("https://api.africastalking.com/version1/messaging/bulk", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", apiKey: config.africasTalkingApiKey },
    body: JSON.stringify({ username: config.africasTalkingUsername, message: input.text, senderId: config.africasTalkingSenderId, phoneNumbers: [input.to] }),
  });
  const raw = await response.text();
  if (!response.ok) return { status: "failed" as const, error: `Africa's Talking ${response.status}: ${raw.slice(0, 500)}` };
  try {
    const payload = JSON.parse(raw) as { SMSMessageData?: { Recipients?: Array<{ statusCode?: number; messageId?: string; status?: string }> } };
    const recipient = payload.SMSMessageData?.Recipients?.[0];
    if (!recipient || ![100, 101, 102].includes(recipient.statusCode ?? 0)) return { status: "failed" as const, error: recipient?.status || "Africa's Talking did not accept the SMS" };
    return { status: "sent" as const, providerMessageId: recipient.messageId };
  } catch {
    return { status: "failed" as const, error: "Africa's Talking returned an unreadable response" };
  }
}

async function recordDelivery(db: MarketplaceDb, input: { notificationId: number; channel: "email" | "sms"; recipient: string; provider: string; status: "pending" | "sent" | "failed" | "skipped"; providerMessageId?: string; errorMessage?: string }) {
  const current = (await db.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.notificationId, input.notificationId), eq(notificationDeliveries.channel, input.channel), eq(notificationDeliveries.recipient, input.recipient))).limit(1))[0];
  const values = { notificationId: input.notificationId, channel: input.channel, recipient: input.recipient, provider: input.provider, status: input.status, providerMessageId: input.providerMessageId ?? null, errorMessage: input.errorMessage ?? null, attemptedAt: new Date(), sentAt: input.status === "sent" ? new Date() : null };
  if (current) await db.update(notificationDeliveries).set(values).where(eq(notificationDeliveries.id, current.id));
  else await db.insert(notificationDeliveries).values(values);
}

export async function deliverPendingMarketplaceAlerts(db: MarketplaceDb, config = getAlertDeliveryConfig(), fetchImpl: FetchLike = fetch) {
  const rows = await db.select({ notification: notifications, user: users }).from(notifications).innerJoin(users, eq(notifications.userId, users.id)).orderBy(desc(notifications.createdAt)).limit(100);
  let emailSent = 0;
  let smsSent = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.user.email && hasEmailDelivery(config)) {
      const existing = (await db.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.notificationId, row.notification.id), eq(notificationDeliveries.channel, "email"), eq(notificationDeliveries.recipient, row.user.email))).limit(1))[0];
      if (existing?.status !== "sent") {
        const result = await sendAlertEmail({ to: row.user.email, subject: `Mugo Automobiles: ${row.notification.title}`, text: `${row.notification.body}\n\nOpen Mugo Automobiles: ${row.notification.href ?? "/"}` }, config, fetchImpl);
        await recordDelivery(db, { notificationId: row.notification.id, channel: "email", recipient: row.user.email, provider: "sendgrid", status: result.status, providerMessageId: result.status === "sent" ? result.providerMessageId : undefined, errorMessage: result.status === "sent" ? undefined : result.error });
        if (result.status === "sent") emailSent += 1;
        if (result.status === "failed") failed += 1;
      }
    }
    if (["aging_inventory", "follow_up"].includes(row.notification.kind) && hasSmsDelivery(config)) {
      const existing = (await db.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.notificationId, row.notification.id), eq(notificationDeliveries.channel, "sms"), eq(notificationDeliveries.recipient, config.ownerSmsRecipient))).limit(1))[0];
      if (existing?.status !== "sent") {
        const result = await sendAlertSms({ to: config.ownerSmsRecipient, text: `Mugo Automobiles: ${row.notification.title}. ${row.notification.body}`.slice(0, 1500) }, config, fetchImpl);
        await recordDelivery(db, { notificationId: row.notification.id, channel: "sms", recipient: config.ownerSmsRecipient, provider: "africas_talking", status: result.status, providerMessageId: result.status === "sent" ? result.providerMessageId : undefined, errorMessage: result.status === "sent" ? undefined : result.error });
        if (result.status === "sent") smsSent += 1;
        if (result.status === "failed") failed += 1;
      }
    }
  }
  return { emailSent, smsSent, failed, emailConfigured: hasEmailDelivery(config), smsConfigured: hasSmsDelivery(config) };
}
