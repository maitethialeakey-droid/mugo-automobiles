import { createHash, randomUUID } from "crypto";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { paymentIntents, paymentWebhookReceipts, payments, type User } from "../drizzle/schema";
import { getDb } from "./db";

export const paymentProviders = ["bank_transfer", "mpesa", "airtel_money", "paypal", "payoneer", "crypto"] as const;
export type PaymentProvider = typeof paymentProviders[number];

type PaymentConfig = Record<PaymentProvider, { configured: boolean; liveEnabled: boolean; label: string; activationRequirement: string }>;
type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function hasUsableMerchantConfiguration(...values: Array<string | undefined>) {
  return values.every(value => {
    const normalized = value?.trim();
    return Boolean(normalized) && !/(TO_BE_ADDED|NOT_CONFIGURED|YOUR_[A-Z_]*|BANK_DETAILS)/i.test(normalized!);
  });
}

export function getPaymentProviderConfig(env: NodeJS.ProcessEnv = process.env): PaymentConfig {
  return {
    bank_transfer: { configured: hasUsableMerchantConfiguration(env.MUGO_BANK_TRANSFER_INSTRUCTIONS), liveEnabled: false, label: "Bank transfer", activationRequirement: "Verified bank settlement instructions and manual reconciliation approval" },
    mpesa: { configured: hasUsableMerchantConfiguration(env.MPESA_CONSUMER_KEY, env.MPESA_CONSUMER_SECRET, env.MPESA_SHORTCODE, env.MPESA_PASSKEY), liveEnabled: false, label: "M-Pesa", activationRequirement: "Live Daraja application, Safaricom go-live approval, shortcode, callback registration, verified callback controls, and explicit activation" },
    airtel_money: { configured: hasUsableMerchantConfiguration(env.AIRTEL_MONEY_CLIENT_ID, env.AIRTEL_MONEY_CLIENT_SECRET, env.AIRTEL_MONEY_MERCHANT_ID), liveEnabled: false, label: "Airtel Money", activationRequirement: "Airtel Africa merchant application, collection credentials, callback registration, verified callback controls, and explicit activation" },
    paypal: { configured: hasUsableMerchantConfiguration(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET, env.PAYPAL_WEBHOOK_ID), liveEnabled: false, label: "PayPal", activationRequirement: "PayPal business account, live client credentials, webhook ID, verified webhook signature handling, and explicit activation" },
    payoneer: { configured: hasUsableMerchantConfiguration(env.PAYONEER_API_KEY, env.PAYONEER_PROGRAM_ID), liveEnabled: false, label: "Payoneer", activationRequirement: "Approved Payoneer programme, production API access, verified event subscription, and explicit activation" },
    crypto: { configured: hasUsableMerchantConfiguration(env.MUGO_CRYPTO_PROVIDER, env.MUGO_CRYPTO_WEBHOOK_SECRET), liveEnabled: false, label: "Crypto", activationRequirement: "Named compliant crypto payment processor, approved settlement wallet, verified webhook signatures, and explicit activation" },
  };
}

export function isKnownPaymentProvider(value: string): value is PaymentProvider {
  return paymentProviders.includes(value as PaymentProvider);
}

export function canCreateLiveCheckout(provider: PaymentProvider, config = getPaymentProviderConfig()) {
  return config[provider].configured && config[provider].liveEnabled;
}

export function makePaymentReference(orderId: number) {
  return `MUGO-${orderId}-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function verifyPayPalWebhook(headers: Record<string, string | undefined>, webhookEvent: unknown, env: NodeJS.ProcessEnv = process.env, fetchImpl: FetchLike = fetch) {
  const clientId = env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = env.PAYPAL_CLIENT_SECRET?.trim();
  const webhookId = env.PAYPAL_WEBHOOK_ID?.trim();
  if (!hasUsableMerchantConfiguration(clientId, clientSecret, webhookId)) return { verified: false, reason: "paypal-not-configured" } as const;
  const baseUrl = env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tokenResponse = await fetchImpl(`${baseUrl}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (!tokenResponse.ok) return { verified: false, reason: `paypal-token-${tokenResponse.status}` } as const;
  const tokenPayload = await tokenResponse.json() as { access_token?: string };
  if (!tokenPayload.access_token) return { verified: false, reason: "paypal-token-missing" } as const;
  const required = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"] as const;
  if (required.some(name => !headers[name])) return { verified: false, reason: "paypal-signature-headers-missing" } as const;
  const verificationResponse = await fetchImpl(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenPayload.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_algo: headers["paypal-auth-algo"], cert_url: headers["paypal-cert-url"], transmission_id: headers["paypal-transmission-id"], transmission_sig: headers["paypal-transmission-sig"], transmission_time: headers["paypal-transmission-time"], webhook_id: webhookId, webhook_event: webhookEvent }),
  });
  if (!verificationResponse.ok) return { verified: false, reason: `paypal-verification-${verificationResponse.status}` } as const;
  const result = await verificationResponse.json() as { verification_status?: string };
  return result.verification_status === "SUCCESS" ? { verified: true, reason: "paypal-verified" } as const : { verified: false, reason: "paypal-signature-failed" } as const;
}

export async function createPaymentIntent(input: { orderId: number; provider: PaymentProvider; amountKsh: number; currency?: string; instructions?: string; expiresAt?: Date | null; createdById: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const config = getPaymentProviderConfig();
  const reference = makePaymentReference(input.orderId);
  const status = canCreateLiveCheckout(input.provider, config) ? "pending" : "draft";
  const result = await db.insert(paymentIntents).values({ ...input, status, currency: input.currency ?? "KES", reference, instructions: input.instructions ?? config[input.provider].activationRequirement });
  return { id: Number(result[0].insertId), reference, status, liveEnabled: canCreateLiveCheckout(input.provider, config) };
}

type PaymentWebhookDependencies = {
  db?: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  verifyPayPal?: typeof verifyPayPalWebhook;
};

export async function handlePaymentWebhook(req: Request, res: Response, dependencies: PaymentWebhookDependencies = {}) {
  const provider = req.params.provider;
  if (!isKnownPaymentProvider(provider)) return res.status(404).json({ error: "unknown-provider" });
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  let payload: unknown;
  try { payload = JSON.parse(body.toString("utf8")); } catch { return res.status(400).json({ error: "invalid-json" }); }
  const providerEventId = String(req.header("x-payment-event-id") || req.header("paypal-transmission-id") || req.header("x-request-id") || createHash("sha256").update(body).digest("hex"));
  const eventType = typeof payload === "object" && payload && "event_type" in payload ? String((payload as { event_type?: unknown }).event_type ?? "") : req.header("x-payment-event-type") || null;
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const db = dependencies.db ?? await getDb();
  if (!db) return res.status(503).json({ error: "database-unavailable" });
  const existing = (await db.select().from(paymentWebhookReceipts).where(and(eq(paymentWebhookReceipts.provider, provider), eq(paymentWebhookReceipts.providerEventId, providerEventId))).limit(1))[0];
  if (existing) return res.status(202).json({ accepted: true, duplicate: true, verified: existing.signatureVerified, processed: false });
  const normalizedHeaders = Object.fromEntries(Object.entries(req.headers).map(([name, value]) => [name.toLowerCase(), Array.isArray(value) ? value[0] : value]));
  const verification = provider === "paypal" ? await (dependencies.verifyPayPal ?? verifyPayPalWebhook)(normalizedHeaders, payload) : { verified: false, reason: "provider-verifier-not-configured" };
  await db.insert(paymentWebhookReceipts).values({ provider, providerEventId, eventType, payloadHash, signatureVerified: verification.verified });
  return res.status(202).json({ accepted: true, verified: verification.verified, processed: false, reason: verification.verified ? "payment-processing-disabled" : verification.reason });
}

export const paymentWebhookHandler = (req: Request, res: Response) => handlePaymentWebhook(req, res);

export async function listPaymentIntegrationStatus(_: User) {
  return Object.entries(getPaymentProviderConfig()).map(([provider, status]) => ({ provider: provider as PaymentProvider, ...status }));
}
