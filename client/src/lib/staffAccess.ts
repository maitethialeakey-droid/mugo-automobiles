export const staffRoles = ["admin", "inventory_manager", "sales_manager", "support_agent", "user"] as const;
export type StaffRole = typeof staffRoles[number];
export type SellerSection = "overview" | "inventory" | "orders" | "customers" | "analytics" | "staff";

const sectionAccess: Record<StaffRole, SellerSection[]> = {
  admin: ["overview", "inventory", "orders", "customers", "analytics", "staff"],
  inventory_manager: ["overview", "inventory"],
  sales_manager: ["overview", "orders", "customers", "analytics"],
  support_agent: ["overview", "customers"],
  user: [],
};

export function asStaffRole(value: string | undefined): StaffRole {
  return staffRoles.includes(value as StaffRole) ? value as StaffRole : "user";
}

export function canAccessSellerSection(role: StaffRole, section: SellerSection) {
  return sectionAccess[role].includes(section);
}

export function getAllowedSellerSections(role: StaffRole) {
  return sectionAccess[role];
}

export function resolveSellerSection(role: StaffRole, requested: string): SellerSection {
  const section = requested as SellerSection;
  return canAccessSellerSection(role, section) ? section : "overview";
}

export const overviewActions: Array<{ section: Exclude<SellerSection, "overview" | "analytics" | "staff">; number: string; title: string; detail: string }> = [
  { section: "inventory", number: "01", title: "Stage listings", detail: "Draft, clone, upload, publish." },
  { section: "orders", number: "02", title: "Work the pipeline", detail: "Inquiry to delivery and close." },
  { section: "customers", number: "03", title: "Keep every follow-up visible", detail: "Turn inquiry history into care." },
];

export function getAllowedOverviewActions(role: StaffRole) {
  return overviewActions.filter(action => canAccessSellerSection(role, action.section));
}
