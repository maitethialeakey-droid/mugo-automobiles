import { describe, expect, it } from "vitest";
import { KENYA_CATALOGUE_BRANDS, KENYA_CATALOGUE_TEMPLATE_COUNT, KENYA_CATALOGUE_TEMPLATES, isKenyaCatalogueTemplate } from "./kenyaCatalogueTemplates";

describe("Kenya catalogue templates", () => {
  it("provides more than 120 unique non-public vehicle templates", () => {
    expect(KENYA_CATALOGUE_TEMPLATE_COUNT).toBeGreaterThan(120);
    expect(new Set(KENYA_CATALOGUE_TEMPLATES.map(template => template.stockNumber)).size).toBe(KENYA_CATALOGUE_TEMPLATE_COUNT);
    expect(KENYA_CATALOGUE_TEMPLATES.every(template => template.priceKsh === 0 && template.location === "Verification required" && isKenyaCatalogueTemplate(template.stockNumber))).toBe(true);
  });

  it("covers a broad mix of Kenya-relevant makes and vehicle classes", () => {
    expect(KENYA_CATALOGUE_BRANDS).toEqual(expect.arrayContaining(["Toyota", "Mazda", "Honda", "Nissan", "Isuzu", "Subaru", "Mitsubishi", "Mercedes-Benz"]));
    expect(Array.from(new Set(KENYA_CATALOGUE_TEMPLATES.map(template => template.bodyType)))).toEqual(expect.arrayContaining(["SUV", "Sedan", "Hatchback", "Pickup", "Van", "Wagon"]));
  });
});
