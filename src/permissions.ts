export type Role =
  | "SYSTEM_ADMIN"
  | "ADMIN"
  | "HOUSEHOLD"
  | "USER"
  | string;

export type Plan =
  | "FREE"
  | "FULL"
  | "PRO"
  | string;

/* ========================
   PERMISOS POR ROL
======================== */

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SYSTEM_ADMIN: ["dashboard", "financial", "executive", "plans"],
  ADMIN: ["dashboard"],
  HOUSEHOLD: [
    "home",
    "dashboard",
    "accounts",
    "bills",
    "users",
    "householdSettings",
  ],
  USER: ["home", "dashboard"],
};

/* ========================
   PERMISOS POR PLAN
======================== */

export const PLAN_PERMISSIONS: Record<Plan, string[]> = {
  FREE: ["home", "dashboard"],
  FULL: [
    "home",
    "dashboard",
    "accounts",
    "bills",
    "users",
    "householdSettings",
    "financial",
    "executive",
    "plans",
  ],
  PRO: [
    "home",
    "dashboard",
    "accounts",
    "bills",
    "users",
    "householdSettings",
    "financial",
    "executive",
    "advancedReports",
    "plans",
  ],
};

/* ========================
   LÓGICA FINAL
======================== */

export function getEffectivePermissions(
  role: Role,
  plan: Plan
): string[] {
  const rolePermissions =
    ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["HOUSEHOLD"];

  // ✅ SYSTEM_ADMIN no depende del plan
  if (role === "SYSTEM_ADMIN") {
    return rolePermissions;
  }

  const planPermissions =
    PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS["FULL"];

  // Intersección real entre rol y plan
  return rolePermissions.filter((section) =>
    planPermissions.includes(section)
  );
}
