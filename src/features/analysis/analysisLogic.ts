/*
 * Cálculos del análisis financiero, movidos SIN CAMBIOS desde DashboardGlobal.tsx
 * y fijados con pruebas de caracterización (constitución, principio III).
 * Los comportamientos dudosos están señalados con "HALLAZGO" y se reportan aparte.
 */

export interface AmountRow {
  year: number;
  month: number;
  amount: number;
  base_amount?: number | null;
  carried_amount?: number | null;
  status: string;
  isDeferred?: boolean | null;
}
export interface AccountWithAmounts {
  id: string;
  name: string;
  group?: { id?: string; name: string } | null;
  amounts: AmountRow[];
}
export interface SavingsMovement {
  year: number;
  month: number;
  type: "DEPOSIT" | "WITHDRAW" | string;
  amount: number;
}
export interface Income {
  year: number;
  month: number;
  amount: number;
}
export interface AnalysisData {
  accounts: AccountWithAmounts[];
  savingsMovements: SavingsMovement[];
  incomes: Income[];
}
export interface MonthSlot {
  year: number;
  month: number;
  key: string;
}

export const NO_GROUP = "Sin Grupo";

/* Ventana de 5 meses centrada en el mes seleccionado */
export function fiveMonthWindow(year: number, month: number): MonthSlot[] {
  const out: MonthSlot[] = [];
  for (let i = -2; i <= 2; i++) {
    const d = new Date(year, month - 1 + i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1, key: `${d.getFullYear()}-${d.getMonth() + 1}` });
  }
  return out;
}

/* Meses desde el seleccionado hasta 12 meses después (13 puntos) */
export function next13Months(year: number, month: number) {
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(year, month - 1 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

/* Retiros de ahorro del mes: se suman al ingreso */
export function withdrawalsInMonth(movements: SavingsMovement[], year: number, month: number) {
  let total = 0;
  movements.forEach((m) => {
    if (m.year === year && m.month === month && m.type === "WITHDRAW") total += Number(m.amount) || 0;
  });
  return total;
}

/* Tabla agrupada por grupo y cuenta para la ventana de meses */
export function groupedTable(accounts: AccountWithAmounts[], window: MonthSlot[]) {
  const grouped: Record<string, (AccountWithAmounts & { amountMap: Record<string, number> })[]> = {};
  const groupTotals: Record<string, Record<string, number>> = {};
  const globalTotals: Record<string, number> = {};
  window.forEach((m) => (globalTotals[m.key] = 0));

  accounts.forEach((acc) => {
    const amountMap: Record<string, number> = {};
    window.forEach((m) => {
      const monthRecords = acc.amounts.filter((a) => a.year === m.year && a.month === m.month);
      if (!monthRecords.length) {
        amountMap[m.key] = 0;
        return;
      }
      amountMap[m.key] = monthRecords
        .filter((r) => {
          const base = Number(r.base_amount || 0);
          const carried = Number(r.carried_amount || 0);
          return !(r.isDeferred && base === 0 && carried === 0);
        })
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    });

    const groupName = acc.group?.name || NO_GROUP;
    if (!grouped[groupName]) {
      grouped[groupName] = [];
      groupTotals[groupName] = {};
      window.forEach((m) => (groupTotals[groupName][m.key] = 0));
    }
    grouped[groupName].push({ ...acc, amountMap });
    window.forEach((m) => {
      const value = amountMap[m.key] || 0;
      groupTotals[groupName][m.key] += value;
      globalTotals[m.key] += value;
    });
  });

  return { grouped, groupTotals, globalTotals };
}

/*
 * Indicadores del mes:
 * - gasto real = solo base_amount
 * - pagado / pendiente = base + arrastre según estado
 */
export function monthIndicators(accounts: AccountWithAmounts[], year: number, month: number) {
  let realExpense = 0;
  let paid = 0;
  let pending = 0;
  accounts.forEach((acc) =>
    acc.amounts.forEach((a) => {
      if (a.year === year && a.month === month) {
        const base = Number(a.base_amount || 0);
        const total = base + Number(a.carried_amount || 0);
        realExpense += base;
        if (a.status === "PAID") paid += total;
        else pending += total;
      }
    })
  );
  return { realExpense, paid, pending };
}

/* Ahorro acumulado hasta el período (incluido), nunca negativo */
export function savingsToDate(movements: SavingsMovement[], year: number, month: number) {
  let total = 0;
  const currentKey = year * 100 + month;
  movements.forEach((m) => {
    const key = m.year * 100 + m.month;
    const amount = Number(m.amount) || 0;
    if (key <= currentKey) {
      if (m.type === "DEPOSIT") total += amount;
      if (m.type === "WITHDRAW") total -= amount;
    }
  });
  return Math.max(total, 0);
}

export function savingsProgress(savings: number, goal: number) {
  return goal > 0 ? Math.min((savings / goal) * 100, 100) : 0;
}

/* % del ingreso usado por el gasto real, tope 150 */
export function riskPercentage(expense: number, income: number) {
  return income > 0 ? Math.min((expense / income) * 100, 150) : 0;
}

export function riskLevel(pct: number): "success" | "warning" | "error" {
  return pct <= 70 ? "success" : pct <= 100 ? "warning" : "error";
}

const sumIncomes = (incomes: Income[], y: number, m: number) =>
  incomes.filter((i) => i.year === y && i.month === m).reduce((s, i) => s + (Number(i.amount) || 0), 0);

const sumExpense = (accounts: AccountWithAmounts[], y: number, m: number) => {
  let total = 0;
  accounts.forEach((acc) =>
    acc.amounts.forEach((a) => {
      if (a.year === y && a.month === m) total += Number(a.base_amount || 0) + Number(a.carried_amount || 0);
    })
  );
  return total;
};

/* Proyección 12 meses: ingreso (+ retiros), gasto (base + arrastre) y ahorro acumulado */
export function projection(data: AnalysisData, year: number, month: number) {
  let running = 0;
  const currentKey = year * 100 + month;
  data.savingsMovements.forEach((s) => {
    const key = s.year * 100 + s.month;
    const amount = Number(s.amount) || 0;
    if (key < currentKey) {
      if (s.type === "DEPOSIT") running += amount;
      if (s.type === "WITHDRAW") running -= amount;
    }
  });
  running = Math.max(running, 0);

  return next13Months(year, month).map(({ year: y, month: m }) => {
    let movement = 0;
    let withdrawalIncome = 0;
    data.savingsMovements.forEach((s) => {
      if (s.year === y && s.month === m) {
        const amount = Number(s.amount) || 0;
        if (s.type === "DEPOSIT") movement += amount;
        if (s.type === "WITHDRAW") {
          movement -= amount;
          withdrawalIncome += amount;
        }
      }
    });
    running = Math.max(running + movement, 0);
    return {
      year: y,
      month: m,
      income: sumIncomes(data.incomes, y, m) + withdrawalIncome,
      expense: sumExpense(data.accounts, y, m),
      savings: running,
    };
  });
}

/*
 * Proyección por grupo.
 * HALLAZGO: suma `amount` de todos los registros, incluidos los postergados,
 * a diferencia de la tabla (que oculta postergados en 0). Se mantiene igual.
 */
export function groupProjection(accounts: AccountWithAmounts[], year: number, month: number) {
  const names = Array.from(new Set(accounts.map((a) => a.group?.name || NO_GROUP)));
  return next13Months(year, month).map(({ year: y, month: m }) => {
    const groups: Record<string, number> = {};
    names.forEach((g) => (groups[g] = 0));
    accounts.forEach((acc) => {
      const g = acc.group?.name || NO_GROUP;
      acc.amounts.forEach((a) => {
        if (a.year === y && a.month === m) groups[g] += Number(a.amount) || 0;
      });
    });
    return { year: y, month: m, groups };
  });
}

/* Saldo neto: ingreso + retiros − (gasto + depósitos a ahorro) */
export function balanceTrend(data: AnalysisData, year: number, month: number) {
  return next13Months(year, month).map(({ year: y, month: m }) => {
    let savingsDeposit = 0;
    let withdrawalIncome = 0;
    data.savingsMovements.forEach((s) => {
      if (s.year === y && s.month === m) {
        const amount = Number(s.amount) || 0;
        if (s.type === "DEPOSIT") savingsDeposit += amount;
        if (s.type === "WITHDRAW") withdrawalIncome += amount;
      }
    });
    const income = sumIncomes(data.incomes, y, m) + withdrawalIncome;
    const expense = sumExpense(data.accounts, y, m) + savingsDeposit;
    const balance = income - expense;
    return {
      year: y,
      month: m,
      income,
      expense,
      savingsDeposit,
      balance,
      percentage: income > 0 ? (balance / income) * 100 : 0,
    };
  });
}

/* Promedio móvil simple de 3 meses */
export function movingAverage(values: number[]) {
  return values.map((_, i, arr) => {
    const slice = arr.slice(Math.max(0, i - 2), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

export type CellState = "deferredOnly" | "paid" | "overdue" | "pending" | "empty";

/* Estado de una celda de la tabla de 5 meses (mismas reglas de color que antes) */
export function cellState(acc: AccountWithAmounts, slot: MonthSlot, current: { year: number; month: number }): CellState {
  const records = acc.amounts.filter((a) => a.year === slot.year && a.month === slot.month);
  if (!records.length) return "empty";
  const isPast = new Date(slot.year, slot.month - 1) < new Date(current.year, current.month - 1);
  const onlyZeroDeferred = records.every(
    (r) => r.isDeferred && Number(r.base_amount || 0) === 0 && Number(r.carried_amount || 0) === 0
  );
  if (onlyZeroDeferred) return "deferredOnly";
  if (records.some((r) => r.status === "PAID")) return "paid";
  if (records.some((r) => r.status !== "PAID")) return isPast ? "overdue" : "pending";
  return "empty";
}
