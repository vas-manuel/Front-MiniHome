/* Lógica pura de la página de planes (sin React) */

export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface PlanInfo {
  id: string;
  name: string;
  maxUsers: number | null;
  maxBillAccounts: number | null;
  maxHistoryMonths: number | null;
  maxAiReadsMonthly: number | null;
  priceMonthly: number;
  priceYearly: number;
}

export interface HouseholdPlanState {
  plan?: { id: string; name: string } | null;
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | null;
  subscriptionEndsAt?: string | null;
  daysRemaining?: number | null;
}

export interface SubscriptionState {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string | null;
  plan: { id: string; name: string };
  billingPeriod: BillingPeriod;
}

export type PlanStatusKind = "free" | "trial" | "paid" | "pending" | "pastDue" | "canceling" | "manual";

export interface PlanStatus {
  kind: PlanStatusKind;
  /** Fecha relevante (fin de prueba, pagado hasta, vigente hasta), ISO */
  until: string | null;
  daysRemaining: number | null;
}

/** Cómo está el plan del hogar, para mostrarlo en una frase */
export function planStatus(h: HouseholdPlanState, sub: SubscriptionState | null): PlanStatus {
  const until = sub?.currentPeriodEnd ?? h.subscriptionEndsAt ?? null;
  const days = h.daysRemaining ?? null;
  if (sub) {
    if (sub.status === "PENDING") return { kind: "pending", until: null, daysRemaining: null };
    if (sub.status === "PAST_DUE") return { kind: "pastDue", until, daysRemaining: days };
    if (sub.cancelAtPeriodEnd) return { kind: "canceling", until, daysRemaining: days };
    return { kind: "paid", until, daysRemaining: days };
  }
  // Sin suscripción pagada: si el backend ya resolvió GRATIS, la prueba o el plan vencieron
  if (!h.plan || h.plan.name.toUpperCase() === "GRATIS") return { kind: "free", until: null, daysRemaining: null };
  if (h.subscriptionStatus === "TRIAL") return { kind: "trial", until: h.subscriptionEndsAt ?? null, daysRemaining: days };
  if (h.subscriptionStatus === "CANCELED") return { kind: "canceling", until: h.subscriptionEndsAt ?? null, daysRemaining: days };
  return { kind: "manual", until: h.subscriptionEndsAt ?? null, daysRemaining: days };
}

/** Meses que se ahorran al pagar anual (redondeado) */
export function yearlySavingMonths(plan: Pick<PlanInfo, "priceMonthly" | "priceYearly">) {
  if (!plan.priceMonthly || !plan.priceYearly) return 0;
  return Math.max(0, Math.round((plan.priceMonthly * 12 - plan.priceYearly) / plan.priceMonthly));
}

export const planPrice = (plan: PlanInfo, period: BillingPeriod) =>
  period === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;

/** Porcentaje de uso para la barra (null = sin límite) */
export function usagePercent(used: number, limit: number | null | undefined) {
  if (limit === null || limit === undefined) return null;
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export type CheckoutBlock = "notOwner" | "unavailable" | "hasSubscription" | "current" | "free" | null;

/** Por qué no se puede contratar un plan (null = se puede) */
export function checkoutBlock(params: {
  plan: PlanInfo;
  role: string;
  onlinePaymentsEnabled: boolean;
  subscription: SubscriptionState | null;
}): CheckoutBlock {
  const { plan, role, onlinePaymentsEnabled, subscription } = params;
  if (plan.priceMonthly <= 0 && plan.priceYearly <= 0) return "free";
  const runningSub = subscription && !subscription.cancelAtPeriodEnd ? subscription : null;
  if (runningSub && runningSub.plan.id === plan.id) return "current";
  if (role !== "OWNER") return "notOwner";
  if (!onlinePaymentsEnabled) return "unavailable";
  if (runningSub) return "hasSubscription";
  return null;
}

/** Resultado del retorno desde Flow (?pago=...) */
export type PaymentReturn = "ok" | "pendiente" | "rechazado" | "error";

export function parsePaymentReturn(search: string): PaymentReturn | null {
  const v = new URLSearchParams(search).get("pago");
  return v === "ok" || v === "pendiente" || v === "rechazado" || v === "error" ? v : null;
}
