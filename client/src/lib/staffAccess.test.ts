import { describe, expect, it } from "vitest";
import { canAccessSellerSection, getAllowedOverviewActions, getAllowedSellerSections, resolveSellerSection } from "./staffAccess";

describe("staff dashboard access", () => {
  it("restricts dashboard sections to the staff role scope", () => {
    expect(getAllowedSellerSections("inventory_manager")).toEqual(["overview", "inventory"]);
    expect(canAccessSellerSection("sales_manager", "orders")).toBe(true);
    expect(canAccessSellerSection("sales_manager", "inventory")).toBe(false);
    expect(canAccessSellerSection("support_agent", "customers")).toBe(true);
    expect(canAccessSellerSection("support_agent", "analytics")).toBe(false);
    expect(canAccessSellerSection("user", "overview")).toBe(false);
  });

  it("only exposes overview actions that navigate to allowed workspaces", () => {
    expect(getAllowedOverviewActions("inventory_manager").map(action => action.section)).toEqual(["inventory"]);
    expect(getAllowedOverviewActions("sales_manager").map(action => action.section)).toEqual(["orders", "customers"]);
    expect(getAllowedOverviewActions("support_agent").map(action => action.section)).toEqual(["customers"]);
    expect(getAllowedOverviewActions("admin").map(action => action.section)).toEqual(["inventory", "orders", "customers"]);
  });

  it("resolves prohibited and unknown direct seller routes back to overview", () => {
    expect(resolveSellerSection("support_agent", "inventory")).toBe("overview");
    expect(resolveSellerSection("inventory_manager", "orders")).toBe("overview");
    expect(resolveSellerSection("sales_manager", "orders")).toBe("orders");
    expect(resolveSellerSection("admin", "staff")).toBe("staff");
    expect(resolveSellerSection("admin", "unknown")).toBe("overview");
  });
});
