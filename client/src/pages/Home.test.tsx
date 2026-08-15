import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketplace: {
      vehicles: { publicList: { useQuery: () => ({ data: [] }) } },
      buyer: { saveVehicle: { useMutation: () => ({ mutate: vi.fn() }) }, unsaveVehicle: { useMutation: () => ({ mutate: vi.fn() }) } },
    },
  },
}));

import Home from "./Home";

describe("Home public catalogue entry", () => {
  it("renders the commercial showroom and Kenya catalogue entry without requiring a session", () => {
    const page = renderToStaticMarkup(<Home />);
    expect(page).toContain("Browse 180 Kenya models");
    expect(page).toContain("04 verified arrivals shown");
    expect(page).toContain("Sign in");
  });
});
