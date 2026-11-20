import { describe, expect, it } from "vitest";
import { getEffectivePermissions } from "./permissions";

describe("getEffectivePermissions", () => {
  it("OWNER con plan PRO tiene todo el hogar", () => {
    expect(getEffectivePermissions("OWNER", "PRO")).toEqual(
      expect.arrayContaining(["dashboard", "accounts", "bills", "users", "householdSettings"])
    );
  });
  it("MANAGER no administra miembros", () => {
    expect(getEffectivePermissions("MANAGER", "PRO")).not.toContain("users");
    expect(getEffectivePermissions("MANAGER", "PRO")).toContain("bills");
  });
  it("VIEWER solo consulta", () => {
    expect(getEffectivePermissions("VIEWER", "PRO")).toEqual(["home", "dashboard"]);
  });
  it("un rol desconocido recibe el mínimo, no permisos completos", () => {
    expect(getEffectivePermissions("ALGO_NUEVO", "PRO")).toEqual(["home", "dashboard"]);
  });
  it("el plan FREE limita aunque el rol sea OWNER", () => {
    expect(getEffectivePermissions("OWNER", "FREE")).toEqual(["home", "dashboard"]);
  });
  it("SYSTEM_ADMIN no depende del plan", () => {
    expect(getEffectivePermissions("SYSTEM_ADMIN", "FREE")).toContain("plans");
  });
});
