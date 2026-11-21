/* Número sin símbolo de moneda (uso legado y ejes de gráficos) */
export const formatCurrency = (value: number | null | undefined) => {
  const safeValue = Number(value || 0);

  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/* Monto con la moneda del hogar: CLP en es-CL → "$45.990" (BRAND.md §5) */
export function formatMoney(
  value: number | null | undefined,
  currency = "CLP",
  locale = "es-CL"
) {
  const key = `${locale}|${currency}`;
  let fmt = moneyFormatters.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "CLP" ? 0 : 2,
      });
    } catch {
      fmt = new Intl.NumberFormat(locale, { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
    }
    moneyFormatters.set(key, fmt);
  }
  return fmt.format(Number(value || 0));
}

/* Formato compacto para ejes: 1.2 M, 450 k */
export function formatCompact(value: number, locale = "es-CL") {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/* "15 nov" en listas (BRAND.md §5) */
export function formatShortDate(date: Date, locale = "es-CL") {
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(".", "");
}

export function formatMonthYear(month: number, year: number, locale = "es-CL") {
  const label = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMonthName(month: number, year: number, locale = "es-CL") {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "long" });
}

/**
 * Escala "redonda" para ejes: pasos de 1, 2, 2,5 o 5 × 10^n. Con `integer`, pasos enteros (conteos).
 * Devuelve el mínimo, el máximo y las marcas a dibujar.
 */
export function niceScale(rawMin: number, rawMax: number, count = 4, integer = false) {
  const lo = Math.min(0, rawMin);
  const hi = Math.max(0, rawMax);
  const span = hi - lo || 1;
  const rough = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step0 = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((st) => st >= rough) ?? 10 * pow;
  const step = integer ? Math.max(1, Math.ceil(step0)) : step0;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step || step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { min, max, ticks };
}
