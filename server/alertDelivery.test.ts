import { describe, expect, it, vi } from "vitest";
import { getAlertDeliveryConfig, getAlertDeliveryTargets, hasEmailDelivery, hasSmsDelivery, recordDelivery, sendAlertEmail, sendAlertSms } from "./alertDelivery";

const config = getAlertDeliveryConfig({ SENDGRID_API_KEY: "sg-key", SENDGRID_FROM_EMAIL: "alerts@mugo.example", AFRICASTALKING_USERNAME: "mugo", AFRICASTALKING_API_KEY: "at-key", AFRICASTALKING_SENDER_ID: "MUGOAUTO", MUGO_ALERT_SMS_TO: "+254700000000" });

describe("marketplace alert provider adapters", () => {
  it("requires complete server-only provider configuration", () => {
    expect(hasEmailDelivery(config)).toBe(true);
    expect(hasSmsDelivery(config)).toBe(true);
    expect(hasEmailDelivery(getAlertDeliveryConfig({ SENDGRID_API_KEY: "key" }))).toBe(false);
    expect(hasSmsDelivery(getAlertDeliveryConfig({ AFRICASTALKING_USERNAME: "mugo" }))).toBe(false);
  });

  it("sends SendGrid mail with a bearer credential and no browser dependency", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 202, text: async () => "", json: async () => ({}) });
    await expect(sendAlertEmail({ to: "buyer@example.com", subject: "Price drop", text: "A saved car changed price." }, config, request)).resolves.toMatchObject({ status: "sent" });
    expect(request).toHaveBeenCalledWith("https://api.sendgrid.com/v3/mail/send", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer sg-key" }) }));
  });

  it("sends Africa’s Talking SMS with the configured sender ID and detects provider rejection", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 201, text: async () => JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 101, messageId: "AT123" }] } }), json: async () => ({}) });
    await expect(sendAlertSms({ to: "+254700000000", text: "Follow-up due" }, config, request)).resolves.toMatchObject({ status: "sent", providerMessageId: "AT123" });
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ senderId: "MUGOAUTO", phoneNumbers: ["+254700000000"] });
  });

  it("routes buyer notifications to email and owner operational alerts to both delivery records", () => {
    const priceDrop = getAlertDeliveryTargets({ kind: "price_drop", title: "Price changed", body: "A saved vehicle changed price.", href: "/buyer" }, { email: "buyer@example.com" }, config);
    expect(priceDrop).toEqual([expect.objectContaining({ channel: "email", recipient: "buyer@example.com", provider: "sendgrid" })]);
    const followUp = getAlertDeliveryTargets({ kind: "follow_up", title: "Follow-up due", body: "Call the buyer today.", href: "/admin/customers" }, { email: "owner@example.com" }, config);
    expect(followUp).toEqual(expect.arrayContaining([expect.objectContaining({ channel: "email", recipient: "owner@example.com" }), expect.objectContaining({ channel: "sms", recipient: "+254700000000", provider: "africas_talking" })]));
  });

  it("persists email and SMS delivery records with their distinct channels and providers", async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: async (value: Record<string, unknown>) => { inserted.push(value); } }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };
    await recordDelivery(fakeDb as never, { notificationId: 7, channel: "email", recipient: "buyer@example.com", provider: "sendgrid", status: "sent" });
    await recordDelivery(fakeDb as never, { notificationId: 7, channel: "sms", recipient: "+254700000000", provider: "africas_talking", status: "sent", providerMessageId: "AT123" });
    expect(inserted).toEqual(expect.arrayContaining([expect.objectContaining({ channel: "email", recipient: "buyer@example.com", provider: "sendgrid", status: "sent" }), expect.objectContaining({ channel: "sms", recipient: "+254700000000", provider: "africas_talking", providerMessageId: "AT123", status: "sent" })]));
  });
});
