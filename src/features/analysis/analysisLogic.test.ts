import { describe, expect, it } from "vitest";
import {
  AnalysisData,
  balanceTrend,
  cellState,
  fiveMonthWindow,
  groupedTable,
  groupProjection,
  monthIndicators,
  movingAverage,
  projection,
  riskLevel,
  riskPercentage,
  savingsProgress,
  savingsToDate,
  withdrawalsInMonth,
} from "./analysisLogic";

const amt = (o: Partial<AnalysisData["accounts"][number]["amounts"][number]>) => ({
  year: 2026,
  month: 11,
  amount: 0,
  base_amount: 0,
  carried_amount: 0,
  status: "NOT_CONFIRMED",
  isDeferred: false,
  ...o,
});

const data: AnalysisData = {
  accounts: [
    {
      id: "luz",
      name: "Luz",
      group: { name: "Servicios" },
      amounts: [
        amt({ month: 11, amount: 15000, base_amount: 10000, carried_amount: 5000, status: "PAID" }),
        amt({ month: 10, amount: 0, base_amount: 0, carried_amount: 0, isDeferred: true }),
        amt({ month: 12, amount: 12000, base_amount: 12000 }),
      ],
    },
    {
      id: "agua",
      name: "Agua",
      group: null,
      amounts: [amt({ month: 11, amount: 8000, base_amount: 8000 }), amt({ month: 9, amount: 7000, base_amount: 7000 })],
    },
  ],
  savingsMovements: [
    { year: 2026, month: 9, type: "DEPOSIT", amount: 50000 },
    { year: 2026, month: 11, type: "WITHDRAW", amount: 20000 },
    { year: 2026, month: 12, type: "DEPOSIT", amount: 10000 },
  ],
  incomes: [
    { year: 2026, month: 11, amount: 900000 },
    { year: 2026, month: 12, amount: 900000 },
  ],
};

describe("ventanas de meses", () => {
  it("5 meses centrados que cruzan el año", () => {
    expect(fiveMonthWindow(2026, 1).map((m) => m.key)).toEqual(["2025-11", "2025-12", "2026-1", "2026-2", "2026-3"]);
  });
});

describe("groupedTable", () => {
  it("oculta postergados en 0, suma amount y agrupa sin grupo en 'Sin Grupo'", () => {
    const w = fiveMonthWindow(2026, 11);
    const { grouped, groupTotals, globalTotals } = groupedTable(data.accounts, w);
    expect(Object.keys(grouped)).toEqual(["Servicios", "Sin Grupo"]);
    expect(groupTotals.Servicios["2026-11"]).toBe(15000);
    expect(groupTotals.Servicios["2026-10"]).toBe(0);
    expect(globalTotals["2026-11"]).toBe(23000);
    expect(globalTotals["2026-9"]).toBe(7000);
    expect(globalTotals["2027-1"]).toBe(0);
  });
});

describe("indicadores del mes", () => {
  it("gasto real = solo base; pagado/pendiente = base + arrastre por estado", () => {
    expect(monthIndicators(data.accounts, 2026, 11)).toEqual({ realExpense: 18000, paid: 15000, pending: 8000 });
  });
  it("retiros del mes", () => {
    expect(withdrawalsInMonth(data.savingsMovements, 2026, 11)).toBe(20000);
    expect(withdrawalsInMonth(data.savingsMovements, 2026, 10)).toBe(0);
  });
  it("ahorro hasta el período incluido y nunca negativo", () => {
    expect(savingsToDate(data.savingsMovements, 2026, 11)).toBe(30000);
    expect(savingsToDate(data.savingsMovements, 2026, 8)).toBe(0);
    expect(savingsToDate([{ year: 2026, month: 1, type: "WITHDRAW", amount: 5 }], 2026, 1)).toBe(0);
  });
  it("progreso de meta con tope 100 y meta 0 → 0", () => {
    expect(savingsProgress(30000, 20000)).toBe(100);
    expect(savingsProgress(5000, 20000)).toBe(25);
    expect(savingsProgress(5000, 0)).toBe(0);
  });
  it("riesgo con tope 150 y umbrales 70 / 100", () => {
    expect(riskPercentage(300, 100)).toBe(150);
    expect(riskPercentage(50, 0)).toBe(0);
    expect(riskLevel(70)).toBe("success");
    expect(riskLevel(100)).toBe("warning");
    expect(riskLevel(100.1)).toBe("error");
  });
});

describe("proyección 12 meses", () => {
  const p = projection(data, 2026, 11);
  it("13 puntos desde el mes seleccionado", () => {
    expect(p).toHaveLength(13);
    expect(p[0]).toMatchObject({ year: 2026, month: 11 });
    expect(p[12]).toMatchObject({ year: 2027, month: 11 });
  });
  it("ingreso incluye retiros; gasto = base + arrastre; ahorro acumulado", () => {
    expect(p[0]).toMatchObject({ income: 920000, expense: 23000, savings: 30000 });
    expect(p[1]).toMatchObject({ income: 900000, expense: 12000, savings: 40000 });
    expect(p[2]).toMatchObject({ income: 0, expense: 0, savings: 40000 });
  });
});

describe("proyección por grupo (comportamiento original)", () => {
  it("suma amount de todos los registros del mes, incluidos postergados", () => {
    const g = groupProjection(data.accounts, 2026, 11);
    expect(g[0].groups).toEqual({ Servicios: 15000, "Sin Grupo": 8000 });
    expect(g[1].groups).toEqual({ Servicios: 12000, "Sin Grupo": 0 });
  });
});

describe("saldo neto", () => {
  const b = balanceTrend(data, 2026, 11);
  it("ingreso + retiros − (gasto + depósitos)", () => {
    expect(b[0]).toMatchObject({ income: 920000, expense: 23000, savingsDeposit: 0, balance: 897000 });
    expect(b[1]).toMatchObject({ income: 900000, expense: 22000, savingsDeposit: 10000, balance: 878000 });
    expect(b[0].percentage).toBeCloseTo(97.5, 1);
    expect(b[2].percentage).toBe(0);
  });
  it("promedio móvil de 3", () => {
    expect(movingAverage([3, 6, 9, 12])).toEqual([3, 4.5, 6, 9]);
  });
});

describe("estado de celda de la tabla", () => {
  const cur = { year: 2026, month: 11 };
  const w = fiveMonthWindow(2026, 11);
  const slot = (key: string) => w.find((m) => m.key === key)!;
  it("pagado, postergado vacío, vencido (mes pasado) y pendiente", () => {
    expect(cellState(data.accounts[0], slot("2026-11"), cur)).toBe("paid");
    expect(cellState(data.accounts[0], slot("2026-10"), cur)).toBe("deferredOnly");
    expect(cellState(data.accounts[1], slot("2026-9"), cur)).toBe("overdue");
    expect(cellState(data.accounts[0], slot("2026-12"), cur)).toBe("pending");
    expect(cellState(data.accounts[1], slot("2027-1"), cur)).toBe("empty");
  });
});
