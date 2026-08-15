import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: "admin",
  path: "/admin",
  navigate: vi.fn(),
  inventoryRows: [] as Array<{ id: number; year: number; make: string; model: string; location: string; stockNumber: string; vin: string | null; priceKsh: number; status: "draft" | "published"; media: Array<{ url: string }> }>,
  orderRows: [{ order: { id: 11, status: "reserved", agreedPriceKsh: 2500000 }, vehicle: { make: "Toyota", model: "Prado" }, payment: null }],
  inquiryRows: [{ inquiry: { id: 21, contactName: "Buyer", status: "open", message: "Please share the inspection report.", contactEmail: "buyer@example.com", contactPhone: null }, vehicle: { make: "Mazda", model: "CX-5" } }],
}));
const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
const invalidate = vi.fn();
const baseSummary = { inventoryCounts: [], openInquiryCount: 0, agingInventory: [], reconciledRevenueKsh: 0 };

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, default: actual, useEffect: (effect: React.EffectCallback) => { effect(); } };
});
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: state.role, name: "Test staff" }, loading: false }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => [state.path, state.navigate] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ marketplace: { vehicles: { adminList: { invalidate } }, admin: { summary: { invalidate } }, orders: { adminList: { invalidate } }, inquiries: { adminList: { invalidate } }, staff: { list: { invalidate } } } }),
    marketplace: {
      admin: { summary: { useQuery: () => ({ data: baseSummary }) } },
      vehicles: { adminList: { useQuery: () => ({ data: state.inventoryRows }) }, create: { useMutation: () => mutation }, updateStatus: { useMutation: () => mutation }, clone: { useMutation: () => mutation } },
      catalogue: { stageKenyaDrafts: { useMutation: () => mutation } },
      uploads: { upload: { useMutation: () => mutation } },
      orders: { adminList: { useQuery: () => ({ data: state.orderRows }) }, create: { useMutation: () => mutation }, updateStatus: { useMutation: () => mutation }, reconcilePayment: { useMutation: () => mutation }, generateDocument: { useMutation: () => mutation } },
      inquiries: { adminList: { useQuery: () => ({ data: state.inquiryRows }) } },
      staff: { list: { useQuery: () => ({ data: [] }) }, updateRole: { useMutation: () => mutation } },
    },
  },
}));

import AdminDashboard from "./AdminDashboard";

function render(role: string, path = "/admin") {
  state.role = role;
  state.path = path;
  return renderToStaticMarkup(<AdminDashboard />);
}

describe("AdminDashboard staff CTAs", () => {
  beforeEach(() => { state.navigate.mockReset(); state.inventoryRows = []; });

  it("renders only the overview operations assigned to every staff role", () => {
    const admin = render("admin");
    expect(admin).toContain("Stage listings");
    expect(admin).toContain("Work the pipeline");
    expect(admin).toContain("Keep every follow-up visible");

    const inventory = render("inventory_manager");
    expect(inventory).toContain("Stage listings");
    expect(inventory).not.toContain("Work the pipeline");
    expect(inventory).not.toContain("Keep every follow-up visible");

    const sales = render("sales_manager");
    expect(sales).not.toContain("Stage listings");
    expect(sales).toContain("Work the pipeline");
    expect(sales).toContain("Keep every follow-up visible");

    const support = render("support_agent");
    expect(support).not.toContain("Stage listings");
    expect(support).not.toContain("Work the pipeline");
    expect(support).toContain("Keep every follow-up visible");
  });

  it("calls navigation when staff land on a forbidden direct route", () => {
    render("support_agent", "/admin/inventory");
    expect(state.navigate).toHaveBeenCalledWith("/admin");
    state.navigate.mockReset();
    render("inventory_manager", "/admin/orders");
    expect(state.navigate).toHaveBeenCalledWith("/admin");
  });

  it("renders section-specific controls only in the permitted staff workspace", () => {
    const inventory = render("inventory_manager", "/admin/inventory");
    expect(inventory).toContain("Add vehicle");
    expect(inventory).toContain("Store import");
    expect(inventory).toContain("Kenya catalogue templates");
    expect(inventory).toContain("Stage Kenya drafts");
    expect(inventory).toContain("Inventory lifecycle");

    const sales = render("sales_manager", "/admin/orders");
    expect(sales).toContain("Order ledger");
    expect(sales).toContain("Advance stage");
    expect(sales).toContain("Invoice PDF");
    expect(sales).not.toContain("Add vehicle");

    const support = render("support_agent", "/admin/customers");
    expect(support).toContain("CRM-lite");
    expect(support).toContain("Open thread");
    expect(support).not.toContain("Add vehicle");

    const admin = render("admin", "/admin/staff");
    expect(admin).toContain("Assign the right route to each staff member.");
    expect(admin).toContain("Team members appear here after they sign in for the first time.");
  });

  it("keeps unverified Kenya catalogue templates out of the publication flow", () => {
    state.inventoryRows = [{ id: 701, year: 2020, make: "Toyota", model: "RAV4", location: "Verification required", stockNumber: "CAT-KE-TOYO-RAV4-2020", vin: null, priceKsh: 0, status: "draft", media: [] }];
    const inventory = render("inventory_manager", "/admin/inventory");
    expect(inventory).toContain("Verification required");
    expect(inventory).toContain("Complete stock verification before publishing a catalogue template.");
    expect(inventory).toContain('disabled=""');
  });
});
