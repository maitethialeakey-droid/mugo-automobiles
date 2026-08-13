import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
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

  it("validates listing draft fields before seller actions reach storage or the database", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.marketplace.vehicles.create({ stockNumber: "A", make: "", model: "", year: 2020, priceKsh: 0, status: "draft" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
  });
});
