/* Roles reales del contrato GraphQL: SYSTEM_ADMIN, OWNER, MANAGER, VIEWER.
   ADMIN / HOUSEHOLD / USER se mantienen por compatibilidad. */
export type Role =
  | "SYSTEM_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "VIEWER"
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
  // Titular: todo el hogar
  OWNER: ["home", "dashboard", "accounts", "bills", "users", "householdSettings"],
  // Gestor: opera cuentas y montos, pero no administra miembros
  MANAGER: ["home", "dashboard", "accounts", "bills", "householdSettings"],
  // Lector: solo consulta
  VIEWER: ["home", "dashboard"],
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
  // Rol desconocido → mínimo privilegio (antes caía en permisos completos)
  const rolePermissions =
    ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS["VIEWER"];

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
