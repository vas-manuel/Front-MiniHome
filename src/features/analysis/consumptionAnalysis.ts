/*
 * Consumo (gastos variables) en el análisis. Se compone SOBRE los cálculos existentes de
 * analysisLogic.ts sin modificarlos (constitución, principio III):
 *   - meses pasados y el actual: consumo real registrado
 *   - meses futuros: promedio de los últimos meses completos con consumo (proyección)
 */

export interface MonthTotal {
  year: number;
  month: number;
  total: number;
}

const key = (y: number, m: number) => y * 100 + m;

/** Meses completos considerados para proyectar el consumo */
export const PROJECTION_BASE_MONTHS = 3;

/**
 * Consumo de un mes: real hasta el mes de `today`; desde el mes siguiente, el promedio de los
 * últimos meses completos que tuvieron consumo (0 si no hay historial).
 */
export function consumptionFor(rows: MonthTotal[], y: number, m: number, today: Date) {
  const current = key(today.getFullYear(), today.getMonth() + 1);
  const target = key(y, m);
  if (target <= current) return rows.find((r) => key(r.year, r.month) === target)?.total ?? 0;
  return projectedMonthly(rows, today);
}

export function projectedMonthly(rows: MonthTotal[], today: Date) {
  const base = Array.from({ length: PROJECTION_BASE_MONTHS }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 1 - i, 1);
    return rows.find((r) => r.year === d.getFullYear() && r.month === d.getMonth() + 1)?.total ?? 0;
  }).filter((v) => v > 0);
  return base.length ? Math.round(base.reduce((s, v) => s + v, 0) / base.length) : 0;
}

/** Suma el consumo al gasto de la proyección de 13 meses */
export function projectionWithConsumption<T extends { year: number; month: number; expense: number }>(
  proj: T[],
  rows: MonthTotal[],
  today: Date
): (T & { consumption: number })[] {
  return proj.map((p) => {
    const consumption = consumptionFor(rows, p.year, p.month, today);
    return { ...p, consumption, expense: p.expense + consumption };
  });
}

/** Igual para el saldo: el consumo es gasto y baja el saldo y su porcentaje */
export function balanceWithConsumption<
  T extends { year: number; month: number; income: number; expense: number; balance: number; percentage: number }
>(trend: T[], rows: MonthTotal[], today: Date): (T & { consumption: number })[] {
  return trend.map((b) => {
    const consumption = consumptionFor(rows, b.year, b.month, today);
    const expense = b.expense + consumption;
    const balance = b.income - expense;
    return { ...b, consumption, expense, balance, percentage: b.income > 0 ? (balance / b.income) * 100 : 0 };
  });
}
