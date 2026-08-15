/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketplace: {
      vehicles: { publicList: { useQuery: () => ({ data: [] }) } },
      buyer: { saveVehicle: { useMutation: () => ({ mutate: vi.fn() }) }, unsaveVehicle: { useMutation: () => ({ mutate: vi.fn() }) } },
      inquiries: { create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    },
  },
}));

import Home from "./Home";

describe("Home public catalogue enquiry", () => {
  it("opens a no-sign-in availability modal and blocks an enquiry without a response channel", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /browse 180 kenya models/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /check availability/i })[0]);

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toMatch(/check availability for/i);
    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^phone$/i)).toBeTruthy();
    expect(screen.getByLabelText(/what would you like to know/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /send enquiry/i }));
    expect(screen.getByRole("status").textContent).toMatch(/email address or phone number/i);
  });
});
