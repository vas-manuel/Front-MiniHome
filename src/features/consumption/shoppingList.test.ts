import { describe, expect, it } from "vitest";
import { budgetLevel, formFromPurchase, toInput } from "./purchaseForm";
import { checkKey, listAsText } from "./shoppingList";
import type { Purchase, ShoppingSuggestion } from "./queries";

const cat = (name: string) => ({ id: name, code: null, name, monthlyBudget: null });
const sug = (productName: string, category: string, lastDate = "2026-11-01"): ShoppingSuggestion => ({
  key: `${productName.toLowerCase()}|kg`,
  productName,
  unit: "kg",
  category: cat(category),
  usualQuantity: 2,
  averageDaysBetween: 20,
  daysSinceLast: 19,
  lastDate,
  nextExpected: "2026-11-21",
  urgency: 0.95,
  averageUnitPrice: 1250,
  bestMerchant: "Lider",
  bestUnitPrice: 1200,
});

describe("presupuesto", () => {
  it("clasifica el uso del presupuesto", () => {
    expect(budgetLevel(100, null)).toBe("none");
    expect(budgetLevel(50, 100)).toBe("ok");
    expect(budgetLevel(80, 100)).toBe("warning");
    expect(budgetLevel(101, 100)).toBe("over");
  });
});

describe("corregir compra", () => {
  it("parte de lo guardado y conserva la categoría de cada producto", () => {
    const p: Purchase = {
      id: "p1",
      merchant_name: "Lider",
      purchase_date: "2026-11-02",
      total: 2580,
      payment_method: "DEBITO",
      source: "RECEIPT_AI",
      receiptUrl: "/api/purchases/p1/receipt",
      items: [{ id: "i1", description: "AZUC 1K", product_name: "Azúcar", quantity: 2, unit: "kg", unit_price: 1290, line_total: 2580, discount: 0, category: cat("Alimentos") }],
    };
    const input = toInput(formFromPurchase(p));
    expect(input).toMatchObject({ merchant_name: "Lider", purchase_date: "2026-11-02", payment_method: "DEBITO" });
    expect(input).not.toHaveProperty("uploadId");
    expect(input.items[0]).toMatchObject({ description: "AZUC 1K", product_name: "Azúcar", quantity: 2, line_total: 2580, category_id: "Alimentos" });
  });
});

describe("lista de compras", () => {
  it("la marca depende de la última compra", () => {
    expect(checkKey(sug("Azúcar", "Alimentos"))).not.toBe(checkKey(sug("Azúcar", "Alimentos", "2026-11-15")));
  });

  it("arma el texto por categoría sin lo ya marcado", () => {
    const items = [sug("Azúcar", "Alimentos"), sug("Arroz", "Alimentos"), sug("Cloro", "Aseo")];
    const text = listAsText(items, new Set([checkKey(items[1])]), "Lista");
    expect(text).toBe("Lista\n\nAlimentos:\n- Azúcar (2 kg)\n\nAseo:\n- Cloro (2 kg)");
  });
});
