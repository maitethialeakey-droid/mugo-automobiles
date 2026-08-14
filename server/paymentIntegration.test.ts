import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { canCreateLiveCheckout, getPaymentProviderConfig, handlePaymentWebhook, hasUsableMerchantConfiguration, isKnownPaymentProvider, makePaymentReference, verifyPayPalWebhook } from "./paymentIntegration";

function makeWebhookRequest(provider: string, headers: Record<string, string> = {}, payload: unknown = { id: "evt-1" }) {
  return { params: { provider }, headers, body: Buffer.from(JSON.stringify(payload)), header: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

function makeWebhookResponse() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function makeWebhookDb(existing: Array<{ signatureVerified: boolean }> = []) {
  const inserted: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => existing }) }) }),
    insert: () => ({ values: async (value: unknown) => { inserted.push(value); return [{ insertId: 1 }]; } }),
  };
  return { db, inserted };
}

describe("payment integration safety boundary", () => {
  it("keeps every payment rail inactive by default", () => {
    const config = getPaymentProviderConfig({});
    expect(Object.values(config).every(provider => provider.liveEnabled === false)).toBe(true);
    expect(canCreateLiveCheckout("mpesa", config)).toBe(false);
  });

  it("does not enable live checkout merely because credentials are present", () => {
    const config = getPaymentProviderConfig({ MUGO_PAYMENTS_LIVE_ENABLED: "true", MUGO_MPESA_LIVE_ENABLED: "true", MPESA_CONSUMER_KEY: "key", MPESA_CONSUMER_SECRET: "secret", MPESA_SHORTCODE: "123456", MPESA_PASSKEY: "passkey" });
    expect(config.mpesa.configured).toBe(true);
    expect(canCreateLiveCheckout("mpesa", config)).toBe(false);
    expect(canCreateLiveCheckout("paypal", config)).toBe(false);
  });

  it("rejects placeholder templates as merchant configuration", () => {
    const config = getPaymentProviderConfig({ MPESA_CONSUMER_KEY: "MPESA_CONSUMER_KEY_TO_BE_ADDED", MPESA_CONSUMER_SECRET: "MPESA_CONSUMER_SECRET_TO_BE_ADDED", MPESA_SHORTCODE: "MPESA_SHORTCODE_TO_BE_ADDED", MPESA_PASSKEY: "MPESA_PASSKEY_TO_BE_ADDED", MUGO_CRYPTO_PROVIDER: "NOT_CONFIGURED", MUGO_CRYPTO_WEBHOOK_SECRET: "CRYPTO_WEBHOOK_SECRET_TO_BE_ADDED" });
    expect(config.mpesa.configured).toBe(false);
    expect(config.crypto.configured).toBe(false);
    expect(hasUsableMerchantConfiguration("real-value", "YOUR_API_KEY")).toBe(false);
  });

  it("uses an allowlist and unique merchant-safe references", () => {
    expect(isKnownPaymentProvider("paypal")).toBe(true);
    expect(isKnownPaymentProvider("unknown")).toBe(false);
    expect(makePaymentReference(42)).toMatch(/^MUGO-42-[A-Z0-9]{10}$/);
  });

  it("requires PayPal's verification API to explicitly return SUCCESS before trusting a webhook", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "token" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ verification_status: "SUCCESS" }) });
    const headers = { "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.paypal.com/certs/test", "paypal-transmission-id": "evt-123", "paypal-transmission-sig": "signature", "paypal-transmission-time": "2026-08-13T00:00:00Z" };
    await expect(verifyPayPalWebhook(headers, { id: "evt-123" }, { PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret", PAYPAL_WEBHOOK_ID: "webhook" }, fetchImpl)).resolves.toMatchObject({ verified: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns controlled outcomes for unknown, inactive, duplicate, and verification states", async () => {
    const unknownResponse = makeWebhookResponse();
    await handlePaymentWebhook(makeWebhookRequest("unknown"), unknownResponse);
    expect(unknownResponse.status).toHaveBeenCalledWith(404);
    expect(unknownResponse.json).toHaveBeenCalledWith({ error: "unknown-provider" });

    const inactive = makeWebhookDb();
    const inactiveResponse = makeWebhookResponse();
    await handlePaymentWebhook(makeWebhookRequest("mpesa", { "x-payment-event-id": "mpesa-1" }), inactiveResponse, { db: inactive.db as never });
    expect(inactive.inserted).toHaveLength(1);
    expect(inactiveResponse.json).toHaveBeenCalledWith(expect.objectContaining({ accepted: true, verified: false, processed: false, reason: "provider-verifier-not-configured" }));

    const duplicate = makeWebhookDb([{ signatureVerified: true }]);
    const duplicateResponse = makeWebhookResponse();
    await handlePaymentWebhook(makeWebhookRequest("paypal", { "paypal-transmission-id": "duplicate-1" }), duplicateResponse, { db: duplicate.db as never });
    expect(duplicate.inserted).toHaveLength(0);
    expect(duplicateResponse.json).toHaveBeenCalledWith({ accepted: true, duplicate: true, verified: true, processed: false });

    const verified = makeWebhookDb();
    const verifiedResponse = makeWebhookResponse();
    await handlePaymentWebhook(makeWebhookRequest("paypal", { "paypal-transmission-id": "verified-1" }), verifiedResponse, { db: verified.db as never, verifyPayPal: async () => ({ verified: true, reason: "paypal-verified" }) });
    expect(verifiedResponse.json).toHaveBeenCalledWith(expect.objectContaining({ verified: true, processed: false, reason: "payment-processing-disabled" }));
  });
});
