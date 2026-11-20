import { describe, expect, it } from "vitest";
import { initialForm, NEW_ACCOUNT, resultingMonthTotal, toConfirmInput, validateForm } from "./receiptForm";
import type { ReceiptAnalysis } from "./queries";

const NOW = new Date(2026, 10, 20);

const analysis = (over: Partial<ReceiptAnalysis> = {}): ReceiptAnalysis => ({
  uploadId: "u1",
  legible: true,
  total: 49330,
  totalConfidence: "HIGH",
  totalCandidates: [],
  previousBalance: null,
  totalWithoutPreviousBalance: null,
  dueDate: "2026-12-10",
  proposedYear: 2026,
  proposedMonth: 12,
  monthConfidence: "HIGH",
  accountSuggestions: [
    { confidence: "HIGH", reason: "LEARNED_CUSTOMER_NUMBER", account: { id: "a1", name: "Agua" } },
  ],
  duplicate: null,
  ...over,
});

describe("initialForm", () => {
  it("propone cuenta, mes del vencimiento, total y 'Por pagar'", () => {
    const { form, flags } = initialForm(analysis());
    expect(form).toMatchObject({ accountId: "a1", year: 2026, month: 12, amount: "49.330", status: "CONFIRMED", dueDate: "2026-12-10" });
    expect(flags.review).toMatchObject({ accountId: false, month: false, amount: false });
  });

  it("destaca para revisión lo detectado con baja seguridad", () => {
    const { flags } = initialForm(
      analysis({ monthConfidence: "MEDIUM", totalConfidence: "LOW", accountSuggestions: [{ confidence: "MEDIUM", reason: "MERCHANT", account: { id: "a1", name: "Agua" } }] })
    );
    expect(flags.review).toMatchObject({ accountId: true, month: true, amount: true });
  });

  it("FR-013a: con arrastre existente y saldo anterior, propone solo el monto del mes", () => {
    const a = analysis({
      previousBalance: 24640,
      totalWithoutPreviousBalance: 24690,
      duplicate: { sameFile: false, existingAmount: { id: "x", year: 2026, month: 12, amount: 24640, base_amount: 0, carried_amount: 24640, status: "NOT_CONFIRMED" } },
    });
    const { form, flags } = initialForm(a);
    expect(form.amount).toBe("24.690");
    expect(flags.carriedAdjusted).toBe(true);
    expect(resultingMonthTotal(form, a)).toBe(49330);
  });

  it("sin arrastre propone el total a pagar aunque haya saldo anterior (y lo destaca)", () => {
    const { form, flags } = initialForm(analysis({ previousBalance: 24640, totalWithoutPreviousBalance: 24690 }));
    expect(form.amount).toBe("49.330");
    expect(flags.carriedAdjusted).toBe(false);
    expect(flags.review.amount).toBe(true);
  });

  it("sin mes detectado deja el campo vacío", () => {
    const { form } = initialForm(analysis({ proposedYear: null, proposedMonth: null, monthConfidence: null }));
    expect([form.year, form.month]).toEqual(["", ""]);
  });
});

describe("validateForm", () => {
  const base = initialForm(analysis()).form;

  it("formulario completo es válido", () => {
    expect(validateForm(base, NOW).valid).toBe(true);
  });
  it("exige cuenta, mes y monto; nombre si es cuenta nueva", () => {
    const v = validateForm({ ...base, accountId: NEW_ACCOUNT, month: "", amount: "" }, NOW);
    expect(v.errors).toMatchObject({ newAccountName: "required", month: "required", amount: "required" });
  });
  it("rechaza años fuera de actual-5 … actual+1", () => {
    expect(validateForm({ ...base, year: 2028 }, NOW).errors.year).toBe("yearRange");
    expect(validateForm({ ...base, year: 2020 }, NOW).errors.year).toBe("yearRange");
  });
  it("advierte (sin bloquear) meses a más de 12 meses", () => {
    const v = validateForm({ ...base, year: 2024, month: 1 }, NOW);
    expect([v.valid, v.farMonth]).toEqual([true, true]);
    expect(validateForm({ ...base, year: 2027, month: 11 }, NOW).farMonth).toBe(false);
  });
  it("monto cero o mayor a 100 millones es inválido", () => {
    expect(validateForm({ ...base, amount: "0" }, NOW).errors.amount).toBe("invalid");
    expect(validateForm({ ...base, amount: "100.000.001" }, NOW).errors.amount).toBe("invalid");
  });
});

describe("toConfirmInput", () => {
  it("cuenta existente, monto sin separadores y reemplazo opcional", () => {
    const f = initialForm(analysis()).form;
    expect(toConfirmInput("u1", f, "amt9")).toEqual({
      uploadId: "u1", bill_account_id: "a1", year: 2026, month: 12, amount: 49330, status: "CONFIRMED", due_date: "2026-12-10", replaceAmountId: "amt9",
    });
  });
  it("cuenta nueva envía newAccount y no bill_account_id", () => {
    const f = { ...initialForm(analysis()).form, accountId: NEW_ACCOUNT, newAccountName: "  Gas  ", dueDate: "" };
    const input = toConfirmInput("u1", f);
    expect(input).toMatchObject({ newAccount: { name: "Gas" }, due_date: null });
    expect("bill_account_id" in input).toBe(false);
  });
});
