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
