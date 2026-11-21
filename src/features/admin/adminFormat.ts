/* Etiquetas y formatos del panel de administración */

export type AdminState = "PAYING" | "PAST_DUE" | "CANCELING" | "TRIAL" | "COMPLIMENTARY" | "FREE" | "INACTIVE";

export const ADMIN_STATES: AdminState[] = ["PAYING", "PAST_DUE", "CANCELING", "TRIAL", "COMPLIMENTARY", "FREE", "INACTIVE"];

/* Color de estado (siempre junto a su etiqueta, nunca solo) */
export const STATE_CHIP: Record<AdminState, { color: "success" | "warning" | "info" | "primary" | "default"; variant: "filled" | "outlined" }> = {
  PAYING: { color: "success", variant: "filled" },
  PAST_DUE: { color: "warning", variant: "filled" },
  CANCELING: { color: "warning", variant: "outlined" },
  TRIAL: { color: "info", variant: "outlined" },
  COMPLIMENTARY: { color: "primary", variant: "outlined" },
  FREE: { color: "default", variant: "outlined" },
  INACTIVE: { color: "default", variant: "filled" },
};

export const GRANT_REASONS = ["OWN_USE", "COMPENSATION", "SUPPORT", "OTHER"] as const;
export type GrantReason = (typeof GRANT_REASONS)[number];

/** "2026-11" → "nov 2026" */
export function monthLabel(month: string, locale: string, short = false) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale, {
    month: "short",
    year: short ? "2-digit" : "numeric",
    timeZone: "UTC",
  });
}

export function formatDate(iso: string | null | undefined, locale: string) {
  return iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export const pct = (v: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(v || 0);

export const usd = (v: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: v < 10 ? 2 : 0 }).format(v || 0);

/** Los montos del negocio siempre en CLP, aunque el idioma sea otro */
export const clp = (v: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(v || 0));

/** Suma de los meses del reporte */
export function totals<T extends object>(rows: T[], keys: readonly (keyof T)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k as string] = rows.reduce((s: number, r) => s + Number((r as any)[k] ?? 0), 0);
  return out;
}

/** Margen = ganancia / cobrado */
export const margin = (profit: number, gross: number) => (gross > 0 ? profit / gross : 0);
