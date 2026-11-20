/*
 * Lógica de la pantalla "Pagos y montos", extraída sin cambios de comportamiento
 * desde BillAccountsManager.tsx y cubierta por pruebas (constitución, principio III).
 */
import { AmountRecord, BillState, dueDateFor, isHiddenDeferred, parseIsoDate } from "../thisMonth/monthBills";

export interface BillAmount extends AmountRecord {
  id: string;
  product_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  purchase_date?: string | null;
  due_date?: string | null;
  receipt?: { id: string; url: string; mimeType: string } | null;
}

export function previousPeriod(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

export function nextPeriod(month: number, year: number) {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

/* Ordena por año y mes ascendente (no muta el arreglo original) */
export function sortByPeriod<T extends { year: number; month: number }>(list: T[]) {
  return [...list].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
}

/*
 * Resumen de cuentas de consumo, igual al cálculo original:
 * - monthlyTotal suma TODOS los montos recibidos para el año consultado
 *   (la consulta original filtra por año, no por mes; ver hallazgo en el informe)
 * - prevMonthTotal usa el mes anterior al mes del formulario
 */
export function variableSummary(
  yearAmounts: { amount: number }[],
  allAmounts: { year: number; month: number; amount: number }[],
  formMonth: number,
  year: number
) {
  const monthlyTotal = yearAmounts.reduce((sum, a) => sum + Number(a.amount), 0);
  const prev = previousPeriod(formMonth, year);
  const prevMonthTotal = allAmounts
    .filter((a) => a.month === prev.month && a.year === prev.year)
    .reduce((sum, a) => sum + Number(a.amount), 0);
  const variation = prevMonthTotal > 0 ? ((monthlyTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;
  const annualAmounts = allAmounts.filter((a) => a.year === year);
  const annualTotal = annualAmounts.reduce((sum, a) => sum + Number(a.amount), 0);
  const monthsWithData = new Set(annualAmounts.map((a) => `${a.year}-${a.month}`)).size;
  const monthlyAverage = monthsWithData > 0 ? annualTotal / monthsWithData : 0;
  return { monthlyTotal, prevMonthTotal, variation, annualTotal, monthlyAverage };
}

/*
 * Últimos 13 meses (del más antiguo al actual), igual al original:
 * toma el PRIMER registro de cada mes (no suma si hay varios; ver hallazgo).
 */
export function last13Months(all: { year: number; month: number; amount: number }[], today = new Date()) {
  const months: { month: number; year: number; value: number }[] = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const found = all.find((a) => a.month === month && a.year === year);
    months.push({ month, year, value: found ? found.amount : 0 });
  }
  return months;
}

/* ¿El mes anterior quedó postergado hacia este registro? */
export function includesCarriedFromPrevious(record: { year: number; month: number; isDeferred?: boolean | null }, all: { year: number; month: number; isDeferred?: boolean | null }[]) {
  if (record.isDeferred) return false;
  const prev = previousPeriod(record.month, record.year);
  return all.some((p) => p.isDeferred && p.year === prev.year && p.month === prev.month);
}

/* Monto escrito con separador de miles "25.000" → 25000 */
export function parseAmountInput(raw: string) {
  return Number(raw.replace(/\./g, ""));
}

/* Formatea lo que se escribe en el campo monto; devuelve null si no son solo dígitos */
export function formatAmountInput(value: string, locale = "es-CL") {
  const raw = value.replace(/\./g, "");
  if (!/^[0-9]*$/.test(raw)) return null;
  return raw ? new Intl.NumberFormat(locale).format(Number(raw)) : "";
}

/* Estado visual de un registro, con las mismas reglas que "Este mes" */
export function recordState(
  r: { year: number; month: number; status: string; isDeferred?: boolean | null; base_amount?: number | null; carried_amount?: number | null; due_date?: string | null },
  dueDay: number | null | undefined,
  today = new Date()
): { state: BillState; daysUntilDue: number | null; dueDate: Date | null } {
  const dueDate = parseIsoDate(r.due_date) ?? dueDateFor(r.year, r.month, dueDay);
  const daysUntilDue = dueDate
    ? Math.round(
        (new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime() -
          new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
          86_400_000
      )
    : null;

  if (r.status === "PAID") return { state: "paid", daysUntilDue, dueDate };
  if (r.isDeferred || isHiddenDeferred(r as AmountRecord)) return { state: "deferred", daysUntilDue, dueDate };

  const periodKey = r.year * 12 + r.month;
  const todayKey = today.getFullYear() * 12 + today.getMonth() + 1;
  if (periodKey < todayKey) return { state: "overdue", daysUntilDue, dueDate };
  if (periodKey === todayKey && daysUntilDue !== null) {
    if (daysUntilDue < 0) return { state: "overdue", daysUntilDue, dueDate };
    if (daysUntilDue <= 3) return { state: "dueSoon", daysUntilDue, dueDate };
  }
  return { state: "pending", daysUntilDue, dueDate };
}
