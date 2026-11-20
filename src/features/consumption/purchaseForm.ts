/* Estado y reglas de la pantalla de confirmación de una compra (sin React, para probarlo) */
import type { Purchase, PurchaseAnalysis } from "./queries";

export const UNITS = ["un", "kg", "g", "L", "ml"] as const;

export interface ItemForm {
  key: string;
  description: string;
  productName: string;
  quantity: string;
  unit: string;
  lineTotal: string;
  discount: number;
  unitPrice: number | null;
  categoryId: string;
  learned: boolean;
}

export interface PurchaseFormState {
  merchantName: string;
  purchaseDate: string;
  paymentMethod: string;
  items: ItemForm[];
}

let seq = 0;
const nextKey = () => `i${++seq}`;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "1.290" → 1290 ; "2,5" → 2.5 */
export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export const formatNumber = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(Math.round(n * 1000) / 1000).replace(".", ",");

export function emptyItem(categoryId: string): ItemForm {
  return {
    key: nextKey(),
    description: "",
    productName: "",
    quantity: "1",
    unit: "un",
    lineTotal: "",
    discount: 0,
    unitPrice: null,
    categoryId,
    learned: false,
  };
}

export function formFromAnalysis(a: PurchaseAnalysis): PurchaseFormState {
  return {
    merchantName: a.merchantName ?? "",
    purchaseDate: a.purchaseDate ?? todayIso(),
    paymentMethod: a.paymentMethod ?? "",
    items: a.items.map((i) => ({
      key: nextKey(),
      description: i.description,
      productName: i.productName,
      quantity: formatNumber(i.quantity),
      unit: i.unit,
      lineTotal: formatNumber(i.lineTotal),
      discount: i.discount,
      unitPrice: i.unitPrice,
      categoryId: i.categoryId,
      learned: i.learned,
    })),
  };
}

/** Para corregir una compra ya guardada */
export function formFromPurchase(p: Purchase): PurchaseFormState {
  return {
    merchantName: p.merchant_name ?? "",
    purchaseDate: p.purchase_date,
    paymentMethod: p.payment_method ?? "",
    items: p.items.map((i) => ({
      key: nextKey(),
      description: i.description ?? "",
      productName: i.product_name,
      quantity: formatNumber(i.quantity),
      unit: i.unit,
      lineTotal: formatNumber(i.line_total),
      discount: i.discount,
      unitPrice: i.unit_price,
      categoryId: i.category.id,
      learned: false,
    })),
  };
}

/** Uso del presupuesto: nivel para el color de la barra */
export function budgetLevel(spent: number, budget: number | null | undefined): "none" | "ok" | "warning" | "over" {
  if (!budget || budget <= 0) return "none";
  const ratio = spent / budget;
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "warning";
  return "ok";
}

export function emptyForm(categoryId: string): PurchaseFormState {
  return { merchantName: "", purchaseDate: todayIso(), paymentMethod: "", items: [emptyItem(categoryId)] };
}

export const itemsTotal = (items: ItemForm[]) =>
  Math.round(items.reduce((s, i) => s + (parseNumber(i.lineTotal) ?? 0), 0) * 100) / 100;

/** Subtotales por categoría, en el orden de las categorías del hogar */
export function totalsByCategory(items: ItemForm[], categoryOrder: string[]) {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(i.categoryId, (map.get(i.categoryId) ?? 0) + (parseNumber(i.lineTotal) ?? 0)));
  return categoryOrder.filter((id) => map.has(id)).map((id) => ({ categoryId: id, total: map.get(id)! }));
}

export type ItemErrors = Partial<Record<"productName" | "quantity" | "lineTotal" | "categoryId", true>>;

export function validate(form: PurchaseFormState) {
  const itemErrors = form.items.map((i) => {
    const e: ItemErrors = {};
    if (!i.productName.trim()) e.productName = true;
    const q = parseNumber(i.quantity);
    if (q === null || q <= 0) e.quantity = true;
    const t = parseNumber(i.lineTotal);
    if (t === null || t < 0) e.lineTotal = true;
    if (!i.categoryId) e.categoryId = true;
    return e;
  });
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(form.purchaseDate);
  const valid = dateOk && form.items.length > 0 && itemsTotal(form.items) > 0 && itemErrors.every((e) => !Object.keys(e).length);
  return { valid, dateOk, itemErrors };
}

export function toInput(form: PurchaseFormState, upload?: { uploadId: string; engine: string }) {
  return {
    ...(upload ? { uploadId: upload.uploadId, engine: upload.engine } : {}),
    merchant_name: form.merchantName.trim() || null,
    purchase_date: form.purchaseDate,
    payment_method: form.paymentMethod || null,
    items: form.items.map((i) => ({
      description: i.description.trim() || null,
      product_name: i.productName.trim(),
      quantity: parseNumber(i.quantity) ?? 1,
      unit: i.unit,
      unit_price: i.unitPrice,
      discount: i.discount,
      line_total: parseNumber(i.lineTotal) ?? 0,
      category_id: i.categoryId,
    })),
  };
}
