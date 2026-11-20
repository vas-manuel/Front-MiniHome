import { describe, expect, it } from "vitest";
import {
  buildMonthBills,
  summarizeMonth,
  groupByState,
  dueDateFor,
  attentionCount,
  FixedAccount,
} from "./monthBills";

const rec = (over: Partial<FixedAccount["amounts"][number]> = {}) => ({
  id: "r1",
  year: 2026,
  month: 11,
  amount: 10000,
  base_amount: 10000,
  carried_amount: 0,
  status: "NOT_CONFIRMED",
  isDeferred: false,
  ...over,
});

const acc = (over: Partial<FixedAccount> = {}): FixedAccount => ({
  id: "a1",
  name: "Luz",
  due_day: 25,
  group: { name: "Servicios" },
  amounts: [rec()],
  ...over,
});

const TODAY = new Date(2026, 10, 20); // 20 nov 2026

describe("dueDateFor", () => {
  it("ajusta el día al último del mes (31 en febrero → 28)", () => {
    expect(dueDateFor(2026, 2, 31)?.getDate()).toBe(28);
  });
  it("considera año bisiesto (31 en febrero 2028 → 29)", () => {
    expect(dueDateFor(2028, 2, 31)?.getDate()).toBe(29);
  });
  it("sin día de vencimiento devuelve null", () => {
    expect(dueDateFor(2026, 11, null)).toBeNull();
    expect(dueDateFor(2026, 11, 0)).toBeNull();
  });
});

describe("buildMonthBills", () => {
  it("marca como pendiente si vence en más de 3 días", () => {
    const [b] = buildMonthBills([acc({ due_day: 28 })], 2026, 11, TODAY);
    expect(b.state).toBe("pending");
    expect(b.daysUntilDue).toBe(8);
  });

  it("marca por vencer si vence en 3 días o menos, incluido hoy", () => {
    expect(buildMonthBills([acc({ due_day: 23 })], 2026, 11, TODAY)[0].state).toBe("dueSoon");
    const [hoy] = buildMonthBills([acc({ due_day: 20 })], 2026, 11, TODAY);
    expect(hoy.state).toBe("dueSoon");
    expect(hoy.daysUntilDue).toBe(0);
  });

  it("marca vencida si el día ya pasó en el mes actual", () => {
    const [b] = buildMonthBills([acc({ due_day: 15 })], 2026, 11, TODAY);
    expect(b.state).toBe("overdue");
    expect(b.daysUntilDue).toBe(-5);
  });

  it("un mes anterior impago está vencido aunque no tenga día de vencimiento", () => {
    const a = acc({ due_day: null, amounts: [rec({ month: 10 })] });
    expect(buildMonthBills([a], 2026, 10, TODAY)[0].state).toBe("overdue");
  });

  it("cruza el año: diciembre del año anterior impago está vencido", () => {
    const a = acc({ amounts: [rec({ year: 2025, month: 12 })] });
    expect(buildMonthBills([a], 2025, 12, TODAY)[0].state).toBe("overdue");
  });

  it("un mes futuro nunca está vencido", () => {
    const a = acc({ due_day: 1, amounts: [rec({ month: 12 })] });
    expect(buildMonthBills([a], 2026, 12, TODAY)[0].state).toBe("pending");
  });

  it("pagada si todos los registros visibles están pagados", () => {
    const [b] = buildMonthBills([acc({ amounts: [rec({ status: "PAID" })] })], 2026, 11, TODAY);
    expect(b.state).toBe("paid");
    expect(b.amount).toBe(10000);
  });

  it("suma base + arrastre usando amount y oculta postergados en 0", () => {
    const a = acc({
      amounts: [
        rec({ id: "x", amount: 15000, base_amount: 10000, carried_amount: 5000 }),
        rec({ id: "y", amount: 0, base_amount: 0, carried_amount: 0, isDeferred: true }),
      ],
    });
    const [b] = buildMonthBills([a], 2026, 11, TODAY);
    expect(b.amount).toBe(15000);
    expect(b.records.map((r) => r.id)).toEqual(["x"]);
  });

  it("si solo hay un postergado en 0, la cuenta figura como postergada con monto 0", () => {
    const a = acc({ amounts: [rec({ amount: 0, base_amount: 0, carried_amount: 0, isDeferred: true })] });
    const [b] = buildMonthBills([a], 2026, 11, TODAY);
    expect(b.state).toBe("deferred");
    expect(b.amount).toBe(0);
  });

  it("sin registros en el mes → noAmount", () => {
    const a = acc({ amounts: [rec({ month: 10 })] });
    expect(buildMonthBills([a], 2026, 11, TODAY)[0].state).toBe("noAmount");
  });

  it("monto cero pendiente sigue siendo pendiente", () => {
    const a = acc({ due_day: 28, amounts: [rec({ amount: 0, base_amount: 0 })] });
    const [b] = buildMonthBills([a], 2026, 11, TODAY);
    expect(b.state).toBe("pending");
    expect(b.amount).toBe(0);
  });

  it("informa CONFIRMED si hay un registro confirmado pendiente", () => {
    const [b] = buildMonthBills([acc({ due_day: 28, amounts: [rec({ status: "CONFIRMED" })] })], 2026, 11, TODAY);
    expect(b.recordStatus).toBe("CONFIRMED");
  });
});

describe("vencimiento propio del monto (R10)", () => {
  it("due_date del monto tiene prioridad sobre el due_day de la cuenta", () => {
    const [b] = buildMonthBills([acc({ due_day: 28, amounts: [rec({ due_date: "2026-11-21" })] })], 2026, 11, TODAY);
    expect(b.state).toBe("dueSoon");
    expect(b.daysUntilDue).toBe(1);
    expect(b.dueDate?.getDate()).toBe(21);
  });
  it("due_date vencido marca la cuenta vencida aunque la cuenta no tenga due_day", () => {
    const [b] = buildMonthBills([acc({ due_day: null, amounts: [rec({ due_date: "2026-11-10" })] })], 2026, 11, TODAY);
    expect(b.state).toBe("overdue");
  });
  it("sin due_date se mantiene el comportamiento anterior", () => {
    const [b] = buildMonthBills([acc({ due_day: 28, amounts: [rec({ due_date: null })] })], 2026, 11, TODAY);
    expect(b.dueDate?.getDate()).toBe(28);
  });
});

describe("summarizeMonth", () => {
  it("totaliza pagado y por pagar, ignorando cuentas sin monto o postergadas", () => {
    const bills = buildMonthBills(
      [
        acc({ id: "1", amounts: [rec({ amount: 10000, status: "PAID" })] }),
        acc({ id: "2", amounts: [rec({ amount: 2500 })] }),
        acc({ id: "3", amounts: [] }),
        acc({ id: "4", amounts: [rec({ amount: 0, base_amount: 0, isDeferred: true })] }),
      ],
      2026,
      11,
      TODAY
    );
    expect(summarizeMonth(bills)).toEqual({
      total: 12500,
      paid: 10000,
      toPay: 2500,
      paidCount: 1,
      billCount: 2,
      allPaid: false,
    });
  });

  it("allPaid solo si hay al menos una cuenta y todas están pagadas", () => {
    expect(summarizeMonth([]).allPaid).toBe(false);
    const bills = buildMonthBills([acc({ amounts: [rec({ status: "PAID" })] })], 2026, 11, TODAY);
    expect(summarizeMonth(bills).allPaid).toBe(true);
  });
});

describe("groupByState y attentionCount", () => {
  it("ordena secciones (vencidas primero) y por fecha dentro de cada una", () => {
    const bills = buildMonthBills(
      [
        acc({ id: "p", name: "Pagada", amounts: [rec({ status: "PAID" })] }),
        acc({ id: "v2", name: "Agua", due_day: 10 }),
        acc({ id: "v1", name: "Gas", due_day: 5 }),
        acc({ id: "s", name: "Internet", due_day: 21 }),
      ],
      2026,
      11,
      TODAY
    );
    const groups = groupByState(bills);
    expect(groups.map((g) => g.state)).toEqual(["overdue", "dueSoon", "paid"]);
    expect(groups[0].bills.map((b) => b.accountId)).toEqual(["v1", "v2"]);
    expect(attentionCount(bills)).toBe(3);
  });
});
