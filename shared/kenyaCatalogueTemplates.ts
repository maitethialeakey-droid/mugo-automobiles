export type KenyaCatalogueTemplate = {
  stockNumber: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  bodyType: string;
  fuelType: string;
  transmission: string;
  mileageKm: null;
  exteriorColor: null;
  location: string;
  priceKsh: 0;
  description: string;
  conditionSummary: string;
};

type CatalogueProfile = Omit<KenyaCatalogueTemplate, "stockNumber" | "year" | "mileageKm" | "exteriorColor" | "location" | "priceKsh" | "description" | "conditionSummary">;

const stagingYears = [2017, 2018, 2019, 2020] as const;

const profiles: CatalogueProfile[] = [
  { make: "Toyota", model: "Land Cruiser Prado", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Toyota", model: "RAV4", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Toyota", model: "Harrier", trim: "Catalogue template", bodyType: "SUV", fuelType: "Hybrid", transmission: "Automatic" },
  { make: "Toyota", model: "Corolla Fielder", trim: "Catalogue template", bodyType: "Wagon", fuelType: "Petrol", transmission: "CVT" },
  { make: "Toyota", model: "Corolla Axio", trim: "Catalogue template", bodyType: "Sedan", fuelType: "Petrol", transmission: "CVT" },
  { make: "Toyota", model: "Hilux", trim: "Catalogue template", bodyType: "Pickup", fuelType: "Diesel", transmission: "Manual" },
  { make: "Toyota", model: "Hiace", trim: "Catalogue template", bodyType: "Van", fuelType: "Diesel", transmission: "Manual" },
  { make: "Toyota", model: "Fortuner", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Nissan", model: "X-Trail", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "CVT" },
  { make: "Nissan", model: "Note", trim: "Catalogue template", bodyType: "Hatchback", fuelType: "Petrol", transmission: "CVT" },
  { make: "Nissan", model: "Navara", trim: "Catalogue template", bodyType: "Pickup", fuelType: "Diesel", transmission: "Manual" },
  { make: "Honda", model: "Vezel", trim: "Catalogue template", bodyType: "SUV", fuelType: "Hybrid", transmission: "CVT" },
  { make: "Honda", model: "Fit", trim: "Catalogue template", bodyType: "Hatchback", fuelType: "Petrol", transmission: "CVT" },
  { make: "Honda", model: "CR-V", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Mazda", model: "CX-5", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Mazda", model: "Demio", trim: "Catalogue template", bodyType: "Hatchback", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Mazda", model: "CX-8", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Subaru", model: "Forester", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "CVT" },
  { make: "Subaru", model: "XV", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "CVT" },
  { make: "Mitsubishi", model: "Outlander", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Mitsubishi", model: "L200", trim: "Catalogue template", bodyType: "Pickup", fuelType: "Diesel", transmission: "Manual" },
  { make: "Suzuki", model: "Swift", trim: "Catalogue template", bodyType: "Hatchback", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Suzuki", model: "Jimny", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Manual" },
  { make: "Isuzu", model: "D-Max", trim: "Catalogue template", bodyType: "Pickup", fuelType: "Diesel", transmission: "Manual" },
  { make: "Isuzu", model: "MU-X", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Lexus", model: "RX", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Lexus", model: "NX", trim: "Catalogue template", bodyType: "SUV", fuelType: "Hybrid", transmission: "Automatic" },
  { make: "Hyundai", model: "Tucson", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Hyundai", model: "Santa Fe", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Kia", model: "Sportage", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Kia", model: "Sorento", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Volkswagen", model: "Tiguan", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Volkswagen", model: "Golf", trim: "Catalogue template", bodyType: "Hatchback", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Mercedes-Benz", model: "C200", trim: "Catalogue template", bodyType: "Sedan", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Mercedes-Benz", model: "GLC", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "BMW", model: "X3", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "BMW", model: "320i", trim: "Catalogue template", bodyType: "Sedan", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Land Rover", model: "Discovery Sport", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Land Rover", model: "Range Rover Evoque", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Ford", model: "Ranger", trim: "Catalogue template", bodyType: "Pickup", fuelType: "Diesel", transmission: "Manual" },
  { make: "Ford", model: "Everest", trim: "Catalogue template", bodyType: "SUV", fuelType: "Diesel", transmission: "Automatic" },
  { make: "Audi", model: "Q5", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Peugeot", model: "3008", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
  { make: "Volvo", model: "XC60", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol hybrid", transmission: "Automatic" },
  { make: "Daihatsu", model: "Terios", trim: "Catalogue template", bodyType: "SUV", fuelType: "Petrol", transmission: "Automatic" },
];

const compact = (value: string) => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const templateNotice = "Catalogue template only — verify actual stock, VIN, media, condition, price, and import documentation before publication.";

export const KENYA_CATALOGUE_TEMPLATES: KenyaCatalogueTemplate[] = profiles.flatMap(profile => stagingYears.map(year => ({
  ...profile,
  year,
  stockNumber: `CAT-KE-${compact(profile.make).slice(0, 4)}-${compact(profile.model).slice(0, 8)}-${year}`,
  mileageKm: null,
  exteriorColor: null,
  location: "Verification required",
  priceKsh: 0,
  description: templateNotice,
  conditionSummary: "Template only; inspection and condition report not completed.",
})));

export const KENYA_CATALOGUE_TEMPLATE_COUNT = KENYA_CATALOGUE_TEMPLATES.length;
export const KENYA_CATALOGUE_BRANDS = Array.from(new Set(KENYA_CATALOGUE_TEMPLATES.map(template => template.make)));

export function isKenyaCatalogueTemplate(stockNumber: string) {
  return stockNumber.startsWith("CAT-KE-");
}
