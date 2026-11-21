import { describe, expect, it } from "vitest";
import { checkoutBlock, planAlerts, parsePaymentReturn, planStatus, PlanInfo, SubscriptionState, usagePercent, yearlySavingMonths } from "./plansLogic";

const HOGAR: PlanInfo = {
  id: "h",
  name: "HOGAR",
  maxUsers: 5,
  maxBillAccounts: null,
  maxHistoryMonths: 36,
  maxAiReadsMonthly: 20,
  priceMonthly: 2990,
  priceYearly: 29900,
};
const GRATIS: PlanInfo = { ...HOGAR, id: "g", name: "GRATIS", priceMonthly: 0, priceYearly: 0 };
const FAMILIA: PlanInfo = { ...HOGAR, id: "f", name: "FAMILIA", priceMonthly: 4990, priceYearly: 49900 };

const sub = (over: Partial<SubscriptionState> = {}): SubscriptionState => ({
  status: "ACTIVE",
  cancelAtPeriodEnd: false,
  currentPeriodEnd: "2026-12-20T03:00:00.000Z",
  plan: { id: "h", name: "HOGAR" },
  billingPeriod: "MONTHLY",
  ...over,
});

describe("planStatus", () => {
  it("prueba vigente", () => {
    const s = planStatus({ plan: { id: "h", name: "HOGAR" }, subscriptionStatus: "TRIAL", subscriptionEndsAt: "2027-01-01", daysRemaining: 40 }, null);
    expect(s).toEqual({ kind: "trial", until: "2027-01-01", daysRemaining: 40 });
  });
  it("prueba vencida: el backend ya devuelve GRATIS", () => {
    expect(planStatus({ plan: { id: "g", name: "GRATIS" }, subscriptionStatus: "TRIAL" }, null).kind).toBe("free");
  });
  it("suscripción pagada, morosa, pendiente y cancelada al final del período", () => {
    const h = { plan: { id: "h", name: "HOGAR" }, subscriptionStatus: "ACTIVE" as const };
    expect(planStatus(h, sub()).kind).toBe("paid");
    expect(planStatus(h, sub()).until).toBe("2026-12-20T03:00:00.000Z");
    expect(planStatus(h, sub({ status: "PAST_DUE" })).kind).toBe("pastDue");
    expect(planStatus(h, sub({ status: "PENDING" })).kind).toBe("pending");
    expect(planStatus(h, sub({ cancelAtPeriodEnd: true })).kind).toBe("canceling");
  });
  it("asignado por un administrador, sin suscripción", () => {
    expect(planStatus({ plan: { id: "f", name: "FAMILIA" }, subscriptionStatus: "ACTIVE", subscriptionEndsAt: null }, null)).toEqual({
      kind: "manual",
      until: null,
      daysRemaining: null,
    });
  });
});

describe("precios y uso", () => {
  it("el anual ahorra 2 meses", () => {
    expect(yearlySavingMonths(HOGAR)).toBe(2);
    expect(yearlySavingMonths(FAMILIA)).toBe(2);
    expect(yearlySavingMonths(GRATIS)).toBe(0);
  });
  it("porcentaje de uso", () => {
    expect(usagePercent(3, 5)).toBe(60);
    expect(usagePercent(9, 8)).toBe(100);
    expect(usagePercent(4, null)).toBeNull();
  });
});

describe("checkoutBlock", () => {
  const base = { role: "OWNER", onlinePaymentsEnabled: true, subscription: null };
  it("se puede contratar", () => expect(checkoutBlock({ ...base, plan: HOGAR })).toBeNull());
  it("el gratis no se contrata", () => expect(checkoutBlock({ ...base, plan: GRATIS })).toBe("free"));
  it("solo el titular", () => expect(checkoutBlock({ ...base, role: "MANAGER", plan: HOGAR })).toBe("notOwner"));
  it("sin pago online", () => expect(checkoutBlock({ ...base, onlinePaymentsEnabled: false, plan: HOGAR })).toBe("unavailable"));
  it("con suscripción: el mismo plan es el actual, otro requiere cancelar", () => {
    expect(checkoutBlock({ ...base, subscription: sub(), plan: HOGAR })).toBe("current");
    expect(checkoutBlock({ ...base, subscription: sub(), plan: FAMILIA })).toBe("hasSubscription");
  });
  it("cancelada al final del período: se puede contratar otra", () => {
    expect(checkoutBlock({ ...base, subscription: sub({ cancelAtPeriodEnd: true }), plan: FAMILIA })).toBeNull();
  });
});

describe("parsePaymentReturn", () => {
  it("lee ?pago=", () => {
    expect(parsePaymentReturn("?pago=ok")).toBe("ok");
    expect(parsePaymentReturn("?pago=rechazado")).toBe("rechazado");
    expect(parsePaymentReturn("?pago=otro")).toBeNull();
    expect(parsePaymentReturn("")).toBeNull();
  });
});

describe("planAlerts", () => {
  const hogar = { id: "h", name: "HOGAR" };
  it("prueba por terminar y cobro fallido", () => {
    expect(planAlerts({ plan: hogar, subscriptionStatus: "TRIAL", daysRemaining: 5 })).toEqual([{ id: "trial", days: 5 }]);
    expect(planAlerts({ plan: hogar, subscriptionStatus: "TRIAL", daysRemaining: 20 })).toEqual([]);
    expect(planAlerts({ plan: hogar, subscriptionStatus: "PAST_DUE" })).toEqual([{ id: "pastDue" }]);
  });
  it("límites alcanzados; sin límite no avisa", () => {
    const a = planAlerts({ plan: { id: "g", name: "GRATIS" }, subscriptionStatus: "TRIAL", daysRemaining: 0, totalBillAccounts: 8, accountLimit: 8, totalUsers: 1, userLimit: 2, aiReadsUsed: 3, aiReadsLimit: 3 });
    expect(a).toEqual([{ id: "limit", what: "accounts" }, { id: "limit", what: "ai" }]);
    expect(planAlerts({ plan: hogar, totalBillAccounts: 40, accountLimit: null })).toEqual([]);
  });
});
