import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { claimPublicEnquiryRateLimit, getPublicEnquiryClientKey, resetPublicEnquiryRateLimitsForTests } from "./routers/marketplace";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user" | "inventory_manager" | "sales_manager" | "support_agent"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: `test-${role}`,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("marketplace router guards", () => {
  it("blocks buyer accounts from seller-only dashboard data", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.marketplace.admin.summary()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("validates finance terms before attempting a database write", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.marketplace.finance.estimate({ vehicleId: 1, downPaymentKsh: 0, loanTermMonths: 3, annualRateBasisPoints: 1450 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });

  it("requires a response channel for public availability enquiries before a database write", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.marketplace.inquiries.create({ contactName: "Catalogue shopper", message: "Please confirm availability for this model.", source: "public-kenya-catalogue" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });

  it("rejects public enquiries that fill the hidden spam-trap field before a database write", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.marketplace.inquiries.create({ contactName: "Catalogue shopper", contactEmail: "shopper@example.com", message: "Please confirm availability for this model.", source: "public-kenya-catalogue", website: "https://spam.example" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });

  it("limits repeated public enquiries by client key without affecting a different visitor", () => {
    resetPublicEnquiryRateLimitsForTests();
    const firstClient = getPublicEnquiryClientKey({ headers: { "x-forwarded-for": "198.51.100.10, 10.0.0.1" } });
    const secondClient = getPublicEnquiryClientKey({ ip: "198.51.100.11" });
    expect(firstClient).toBe("198.51.100.10");
    expect(claimPublicEnquiryRateLimit(firstClient, 1)).toBe(true);
    expect(claimPublicEnquiryRateLimit(firstClient, 2)).toBe(true);
    expect(claimPublicEnquiryRateLimit(firstClient, 3)).toBe(true);
    expect(claimPublicEnquiryRateLimit(firstClient, 4)).toBe(true);
    expect(claimPublicEnquiryRateLimit(firstClient, 5)).toBe(false);
    expect(claimPublicEnquiryRateLimit(secondClient, 5)).toBe(true);
  });

  it("returns TOO_MANY_REQUESTS from the public inquiry procedure after the client threshold is reached", async () => {
    resetPublicEnquiryRateLimitsForTests();
    const caller = appRouter.createCaller(contextFor("user"));
    const now = Date.now();
    for (let index = 0; index < 4; index += 1) claimPublicEnquiryRateLimit("unknown", now + index);
    await expect(caller.marketplace.inquiries.create({ contactName: "Rate limited shopper", contactEmail: "shopper@example.com", message: "Please confirm availability for this model.", source: "public-kenya-catalogue" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "TOO_MANY_REQUESTS" });
    resetPublicEnquiryRateLimitsForTests();
  });

  it("validates listing draft fields before seller actions reach storage or the database", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.marketplace.vehicles.create({ stockNumber: "A", make: "", model: "", year: 2020, priceKsh: 0, status: "draft" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });

  it("allows inventory staff to reach inventory validation but blocks sales-only actions", async () => {
    const caller = appRouter.createCaller(contextFor("inventory_manager"));
    await expect(caller.marketplace.vehicles.create({ stockNumber: "A", make: "", model: "", year: 2020, priceKsh: 0, status: "draft" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    await expect(caller.marketplace.orders.adminList()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("allows sales staff to reach order validation but blocks inventory-only actions", async () => {
    const caller = appRouter.createCaller(contextFor("sales_manager"));
    await expect(caller.marketplace.vehicles.create({ stockNumber: "A", make: "", model: "", year: 2020, priceKsh: 0, status: "draft" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    await expect(caller.marketplace.orders.create({ vehicleId: 0, buyerId: 0, agreedPriceKsh: -1 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });

  it("allows support staff to view inquiries but blocks payment operations", async () => {
    const caller = appRouter.createCaller(contextFor("support_agent"));
    await expect(caller.marketplace.inquiries.adminList()).resolves.toEqual([]);
    await expect(caller.marketplace.orders.reconcilePayment({ paymentId: 1, status: "reconciled" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });
});
