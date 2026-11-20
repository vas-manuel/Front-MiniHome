import { describe, expect, it } from "vitest";
import { balanceWithConsumption, consumptionFor, projectedMonthly, projectionWithConsumption } from "./consumptionAnalysis";

const today = new Date(2026, 10, 20); // 20 nov 2026
const rows = [
  { year: 2026, month: 8, total: 100000 },
  { year: 2026, month: 9, total: 0 },
  { year: 2026, month: 10, total: 200000 },
  { year: 2026, month: 11, total: 50000 },
];

describe("consumo en el análisis", () => {
  it("usa lo real hasta el mes actual", () => {
    expect(consumptionFor(rows, 2026, 10, today)).toBe(200000);
    expect(consumptionFor(rows, 2026, 11, today)).toBe(50000);
    expect(consumptionFor(rows, 2026, 7, today)).toBe(0);
  });

  it("proyecta el futuro con el promedio de los últimos meses completos con consumo", () => {
    // ago–oct: 100.000 y 200.000 (septiembre sin consumo no cuenta)
    expect(projectedMonthly(rows, today)).toBe(150000);
    expect(consumptionFor(rows, 2026, 12, today)).toBe(150000);
    expect(consumptionFor(rows, 2027, 6, today)).toBe(150000);
  });

  it("sin historial no proyecta nada", () => {
    expect(projectedMonthly([], today)).toBe(0);
  });

  it("suma el consumo al gasto y recalcula el saldo", () => {
    const proj = projectionWithConsumption([{ year: 2026, month: 11, income: 1000000, expense: 400000, savings: 0 }], rows, today);
    expect(proj[0]).toMatchObject({ expense: 450000, consumption: 50000 });

    const bal = balanceWithConsumption(
      [{ year: 2026, month: 12, income: 1000000, expense: 600000, savingsDeposit: 0, balance: 400000, percentage: 40 }],
      rows,
      today
    );
    expect(bal[0]).toMatchObject({ expense: 750000, balance: 250000, percentage: 25, consumption: 150000 });
  });
});
