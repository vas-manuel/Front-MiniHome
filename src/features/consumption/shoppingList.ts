/* Lista de compras sugerida: marcas por persona (en este navegador) y texto para compartir */
import type { ShoppingSuggestion } from "./queries";
import { formatNumber } from "./purchaseForm";

const STORAGE_KEY = "monihome.shoppingList.checked";

/* La marca se asocia a la última compra: si se vuelve a comprar, el producto reaparece sin marcar */
export const checkKey = (s: Pick<ShoppingSuggestion, "key" | "lastDate">) => `${s.key}@${s.lastDate}`;

export function loadChecked(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Guarda solo las marcas de productos aún sugeridos, para que no crezca sin límite */
export function saveChecked(checked: Set<string>, current: ShoppingSuggestion[]) {
  const valid = new Set(current.map(checkKey));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked].filter((k) => valid.has(k))));
  } catch {
    /* almacenamiento no disponible: la lista funciona igual, sin recordar marcas */
  }
}

/** Texto para copiar o compartir, agrupado por categoría y sin lo ya marcado */
export function listAsText(items: ShoppingSuggestion[], checked: Set<string>, title: string) {
  const pending = items.filter((i) => !checked.has(checkKey(i)));
  const groups = new Map<string, ShoppingSuggestion[]>();
  pending.forEach((i) => groups.set(i.category.name, [...(groups.get(i.category.name) ?? []), i]));
  const lines = [title];
  for (const [category, list] of groups) {
    lines.push("", `${category}:`);
    list.forEach((i) => lines.push(`- ${i.productName} (${formatNumber(i.usualQuantity)} ${i.unit})`));
  }
  return lines.join("\n");
}
