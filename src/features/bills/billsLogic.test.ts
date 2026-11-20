import { describe, expect, it } from "vitest";
import {
  formatAmountInput,
  includesCarriedFromPrevious,
  last13Months,
  nextPeriod,
  parseAmountInput,
  previousPeriod,
  recordState,
  sortByPeriod,
  variableSummary,
} from "./billsLogic";

const TODAY = new Date(2026, 10, 20); // 20 nov 2026

describe("períodos", () => {
  it("enero → diciembre del año anterior y diciembre → enero del siguiente", () => {
    expect(previousPeriod(1, 2026)).toEqual({ month: 12, year: 2025 });
    expect(nextPeriod(12, 2026)).toEqual({ month: 1, year: 2027 });
    expect(nextPeriod(5, 2026)).toEqual({ month: 6, year: 2026 });
  });
  it("ordena por año y mes sin mutar", () => {
    const list = [{ year: 2026, month: 3 }, { year: 2025, month: 12 }, { year: 2026, month: 1 }];
    expect(sortByPeriod(list).map((x) => `${x.year}-${x.month}`)).toEqual(["2025-12", "2026-1", "2026-3"]);
    expect(list[0].month).toBe(3);
  });
});

describe("variableSummary (comportamiento original)", () => {
  const all = [
    { year: 2026, month: 10, amount: 1000 },
    { year: 2026, month: 10, amount: 500 },
    { year: 2026, month: 11, amount: 2000 },
    { year: 2025, month: 12, amount: 999 },
  ];
  it("monthlyTotal suma todos los montos del año recibido y compara con el mes anterior al del formulario", () => {
    const yearAmounts = all.filter((a) => a.year === 2026);
    const s = variableSummary(yearAmounts, all, 11, 2026);
    expect(s.monthlyTotal).toBe(3500);
    expect(s.prevMonthTotal).toBe(1500);
    expect(s.variation).toBeCloseTo(133.333, 2);
    expect(s.annualTotal).toBe(3500);
    expect(s.monthlyAverage).toBe(1750);
  });
  it("en enero compara con diciembre del año anterior", () => {
    const s = variableSummary([{ amount: 100 }], all, 1, 2026);
    expect(s.prevMonthTotal).toBe(999);
  });
  it("sin mes anterior la variación es 0 y sin datos el promedio es 0", () => {
    const s = variableSummary([], [], 6, 2026);
    expect(s).toEqual({ monthlyTotal: 0, prevMonthTotal: 0, variation: 0, annualTotal: 0, monthlyAverage: 0 });
  });
});

describe("last13Months (comportamiento original)", () => {
  it("devuelve 13 meses terminando en el actual y toma el primer registro de cada mes", () => {
    const res = last13Months(
      [
        { year: 2026, month: 11, amount: 10 },
        { year: 2026, month: 11, amount: 99 },
        { year: 2025, month: 11, amount: 5 },
      ],
      TODAY
    );
    expect(res).toHaveLength(13);
    expect(res[0]).toEqual({ year: 2025, month: 11, value: 5 });
    expect(res[12]).toEqual({ year: 2026, month: 11, value: 10 });
    expect(res[6].value).toBe(0);
  });
});

describe("includesCarriedFromPrevious", () => {
  const all = [{ year: 2025, month: 12, isDeferred: true }];
  it("detecta postergación desde diciembre hacia enero", () => {
    expect(includesCarriedFromPrevious({ year: 2026, month: 1 }, all)).toBe(true);
  });
  it("un registro postergado no muestra el aviso", () => {
    expect(includesCarriedFromPrevious({ year: 2026, month: 1, isDeferred: true }, all)).toBe(false);
  });
});

describe("campo monto", () => {
  it("formatea con separador de miles y rechaza letras", () => {
    expect(formatAmountInput("25000")).toBe("25.000");
    expect(formatAmountInput("25.0001")).toBe("250.001");
    expect(formatAmountInput("")).toBe("");
    expect(formatAmountInput("12a")).toBeNull();
  });
  it("parsea quitando puntos", () => {
    expect(parseAmountInput("1.250.000")).toBe(1250000);
    expect(parseAmountInput("0")).toBe(0);
  });
});

describe("recordState", () => {
  const base = { year: 2026, month: 11, status: "CONFIRMED", base_amount: 1, carried_amount: 0 };
  it("pagado gana sobre todo", () => {
    expect(recordState({ ...base, status: "PAID", year: 2020 }, 5, TODAY).state).toBe("paid");
  });
  it("postergado no pagado se muestra postergado aunque sea de un mes pasado", () => {
    expect(recordState({ ...base, month: 10, isDeferred: true }, 5, TODAY).state).toBe("deferred");
  });
  it("usa due_date del monto antes que el día de la cuenta (R10)", () => {
    expect(recordState({ ...base, due_date: "2026-11-21" }, 28, TODAY).state).toBe("dueSoon");
    expect(recordState({ ...base, due_date: "2026-11-01" }, 28, TODAY).state).toBe("overdue");
  });

  it("mes pasado impago → vencido; mes actual según día de vencimiento", () => {
    expect(recordState({ ...base, month: 10 }, null, TODAY).state).toBe("overdue");
    expect(recordState(base, 19, TODAY).state).toBe("overdue");
    expect(recordState(base, 22, TODAY).state).toBe("dueSoon");
    expect(recordState(base, 28, TODAY).state).toBe("pending");
    expect(recordState(base, null, TODAY).state).toBe("pending");
  });
});
