import { describe, expect, it } from "vitest";
import { niceScale } from "./format";

describe("niceScale", () => {
  it("usa pasos redondos que cubren el máximo", () => {
    expect(niceScale(0, 2990)).toEqual({ min: 0, max: 3000, ticks: [0, 1000, 2000, 3000] });
    expect(niceScale(0, 140_000).ticks).toEqual([0, 50_000, 100_000, 150_000]);
  });
  it("conteos: pasos enteros, nunca 0,3", () => {
    expect(niceScale(0, 1, 4, true)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
    expect(niceScale(0, 7, 4, true).ticks).toEqual([0, 2, 4, 6, 8]);
  });
  it("incluye negativos (pérdidas) bajo el cero", () => {
    const s = niceScale(-1200, 3000);
    expect(s.min).toBeLessThanOrEqual(-1200);
    expect(s.ticks).toContain(0);
  });
});
