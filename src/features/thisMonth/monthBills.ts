/*
 * Estado de cada cuenta fija en un mes: qué falta pagar, qué vence pronto y qué está pagado.
 * Lógica pura y probada (constitución, principio III).
 */

export type AmountStatus = "NOT_CONFIRMED" | "CONFIRMED" | "PAID";

export interface AmountRecord {
  id?: string;
  year: number;
  month: number;
  amount: number;
  base_amount?: number | null;
  carried_amount?: number | null;
  status: AmountStatus | string;
  isDeferred?: boolean | null;
}

export interface FixedAccount {
  id: string;
  name: string;
  due_day?: number | null;
  group?: { id?: string; name: string } | null;
  amounts: AmountRecord[];
}

export type BillState = "overdue" | "dueSoon" | "pending" | "deferred" | "paid" | "noAmount";

export interface MonthBill {
  accountId: string;
  name: string;
  groupName: string | null;
  amount: number;
  state: BillState;
  /** NOT_CONFIRMED / CONFIRMED del registro pendiente; PAID si está pagada */
  recordStatus: AmountStatus | null;
  dueDate: Date | null;
  /** Días hasta el vencimiento (negativo si ya venció); null si no hay día de vencimiento */
  daysUntilDue: number | null;
  /** Registros visibles del mes (excluye postergados que quedaron en 0) */
  records: AmountRecord[];
}

export const DUE_SOON_DAYS = 3;

/* Un registro postergado que quedó en 0 se oculta: su monto vive en el mes siguiente */
export function isHiddenDeferred(r: AmountRecord) {
  const base = Number(r.base_amount || 0);
  const carried = Number(r.carried_amount || 0);
  return Boolean(r.isDeferred) && base === 0 && carried === 0;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function dueDateFor(year: number, month: number, dueDay?: number | null) {
  if (!dueDay || dueDay < 1) return null;
  return new Date(year, month - 1, Math.min(dueDay, daysInMonth(year, month)));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayDiff(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function buildMonthBills(
  accounts: FixedAccount[],
  year: number,
  month: number,
  today: Date = new Date()
): MonthBill[] {
  const periodKey = year * 12 + month;
  const todayKey = today.getFullYear() * 12 + today.getMonth() + 1;

  return accounts.map((acc) => {
    const monthRecords = (acc.amounts || []).filter((a) => a.year === year && a.month === month);
    const visible = monthRecords.filter((r) => !isHiddenDeferred(r));
    const dueDate = dueDateFor(year, month, acc.due_day);
    const daysUntilDue = dueDate ? dayDiff(today, dueDate) : null;

    const base: Omit<MonthBill, "state" | "recordStatus" | "amount"> = {
      accountId: acc.id,
      name: acc.name,
      groupName: acc.group?.name ?? null,
      dueDate,
      daysUntilDue,
      records: visible,
    };

    if (monthRecords.length === 0) {
      return { ...base, amount: 0, state: "noAmount", recordStatus: null };
    }
    if (visible.length === 0) {
      return { ...base, amount: 0, state: "deferred", recordStatus: null };
    }

    const amount = visible.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    if (visible.every((r) => r.status === "PAID")) {
      return { ...base, amount, state: "paid", recordStatus: "PAID" };
    }

    const recordStatus: AmountStatus = visible.some(
      (r) => r.status !== "PAID" && r.status === "CONFIRMED"
    )
      ? "CONFIRMED"
      : "NOT_CONFIRMED";

    let state: BillState = "pending";
    if (periodKey < todayKey) {
      state = "overdue";
    } else if (periodKey === todayKey && daysUntilDue !== null) {
      if (daysUntilDue < 0) state = "overdue";
      else if (daysUntilDue <= DUE_SOON_DAYS) state = "dueSoon";
    }

    return { ...base, amount, state, recordStatus };
  });
}

export interface MonthSummary {
  total: number;
  paid: number;
  toPay: number;
  paidCount: number;
  billCount: number;
  allPaid: boolean;
}

export function summarizeMonth(bills: MonthBill[]): MonthSummary {
  let total = 0;
  let paid = 0;
  let paidCount = 0;
  let billCount = 0;

  for (const b of bills) {
    if (b.state === "noAmount" || b.state === "deferred") continue;
    billCount += 1;
    total += b.amount;
    if (b.state === "paid") {
      paid += b.amount;
      paidCount += 1;
    }
  }

  return {
    total,
    paid,
    toPay: total - paid,
    paidCount,
    billCount,
    allPaid: billCount > 0 && paidCount === billCount,
  };
}

export const SECTION_ORDER: BillState[] = ["overdue", "dueSoon", "pending", "deferred", "paid", "noAmount"];

/* Agrupa por estado y ordena por fecha de vencimiento (sin fecha al final) y luego por nombre */
export function groupByState(bills: MonthBill[]) {
  const byDate = (a: MonthBill, b: MonthBill) => {
    const da = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    return da !== db ? da - db : a.name.localeCompare(b.name);
  };
  return SECTION_ORDER.map((state) => ({
    state,
    bills: bills.filter((b) => b.state === state).sort(byDate),
  })).filter((s) => s.bills.length > 0);
}

/* Cuentas que requieren atención hoy (para el aviso de la barra superior) */
export function attentionCount(bills: MonthBill[]) {
  return bills.filter((b) => b.state === "overdue" || b.state === "dueSoon").length;
}
