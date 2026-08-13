import { describe, expect, it, vi } from "vitest";
import { canCreateLiveCheckout, getPaymentProviderConfig, isKnownPaymentProvider, makePaymentReference, verifyPayPalWebhook } from "./paymentIntegration";

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
});
