import { describe, expect, it } from "vitest";
import { emptyForm, formFromAnalysis, itemsTotal, parseNumber, toInput, totalsByCategory, validate } from "./purchaseForm";
import type { PurchaseAnalysis } from "./queries";

const analysis: PurchaseAnalysis = {
  uploadId: "u1",
  engine: "AI",
  legible: true,
  unreadableReason: null,
  previewUrl: "/p",
  merchantName: "Lider",
  purchaseDate: "2026-11-20",
  paymentMethod: "DEBITO",
  total: 3570,
  itemsTotal: 3570,
  difference: 0,
  warnings: [],
  sameFile: false,
  items: [
    { description: "AZUCAR IANSA 1KG", productName: "Azúcar", quantity: 2, unit: "kg", unitPrice: 1290, discount: 0, lineTotal: 2580, categoryId: "food", learned: true },
    { description: "CLORO 1L", productName: "Cloro", quantity: 1, unit: "L", unitPrice: 990, discount: 0, lineTotal: 990, categoryId: "clean", learned: false },
  ],
};

describe("formulario de compra", () => {
  it("lee números con miles chilenos y decimales con coma", () => {
    expect(parseNumber("1.290")).toBe(1290);
    expect(parseNumber("0,395")).toBe(0.395);
    expect(parseNumber("")).toBeNull();
  });

  it("parte desde la boleta leída y suma por categoría", () => {
    const f = formFromAnalysis(analysis);
    expect(f.items[0]).toMatchObject({ productName: "Azúcar", quantity: "2", unit: "kg", lineTotal: "2580", learned: true });
    expect(itemsTotal(f.items)).toBe(3570);
    expect(totalsByCategory(f.items, ["clean", "food"])).toEqual([
      { categoryId: "clean", total: 990 },
      { categoryId: "food", total: 2580 },
    ]);
  });

  it("exige producto, cantidad, monto y total mayor a cero", () => {
    const empty = emptyForm("food");
    expect(validate(empty).valid).toBe(false);
    expect(validate(empty).itemErrors[0]).toMatchObject({ productName: true, lineTotal: true });
    expect(validate(formFromAnalysis(analysis)).valid).toBe(true);
  });

  it("arma el input con la boleta y lo que quedó en pantalla", () => {
    const f = formFromAnalysis(analysis);
    f.items[1].productName = "Cloro gel";
    const input = toInput(f, { uploadId: "u1", engine: "AI" });
    expect(input).toMatchObject({ uploadId: "u1", engine: "AI", merchant_name: "Lider", payment_method: "DEBITO" });
    expect(input.items[1]).toMatchObject({ description: "CLORO 1L", product_name: "Cloro gel", quantity: 1, unit: "L", line_total: 990, category_id: "clean" });
  });
});
