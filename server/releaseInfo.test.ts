import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { releaseInfo } from "./releaseInfo";

describe("production release metadata", () => {
  it("identifies the alert-delivery routing release without enabling payment capture", () => {
    expect(releaseInfo).toMatchObject({ service: "mugo-automobiles", release: "alert-delivery-routing-v1", alertDeliveryRouting: true, paymentCaptureEnabled: false });
  });

  it("keeps the deployed public release artifact aligned with backend metadata", () => {
    const artifact = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../client/public/release.json"), "utf8"));
    expect(artifact).toEqual(releaseInfo);
  });
});
