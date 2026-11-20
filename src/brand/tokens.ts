/*
 * Acceso tipado a los design tokens de MoniHome.
 * Fuente única: ./tokens.json (copia de monihome-brand/tokens/tokens.json).
 * Para actualizar la marca, reemplazar tokens.json; no editar valores aquí.
 */
import raw from "./tokens.json";

type ColorToken = { $value: string };
type ColorGroup = Record<string, ColorToken>;

export type ColorMode = "light" | "dark";

export type SemanticColors = {
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  primarySubtle: string;
  onPrimary: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  info: string;
  infoSubtle: string;
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  focusRing: string;
};

function semantic(group: ColorGroup): SemanticColors {
  const v = (k: string) => group[k].$value;
  return {
    primary: v("primary"),
    primaryHover: v("primary-hover"),
    primaryPressed: v("primary-pressed"),
    primarySubtle: v("primary-subtle"),
    onPrimary: v("on-primary"),
    success: v("success"),
    successSubtle: v("success-subtle"),
    warning: v("warning"),
    warningSubtle: v("warning-subtle"),
    danger: v("danger"),
    dangerSubtle: v("danger-subtle"),
    info: v("info"),
    infoSubtle: v("info-subtle"),
    bg: v("bg"),
    surface: v("surface"),
    surfaceRaised: v("surface-raised"),
    border: v("border"),
    borderStrong: v("border-strong"),
    text: v("text"),
    textSecondary: v("text-secondary"),
    textMuted: v("text-muted"),
    focusRing: v("focus-ring"),
  };
}

const brandGroup = raw.color.brand as unknown as ColorGroup;

export const brand = {
  gradient: raw.gradient.brand.$value,
  gradientStart: brandGroup["gradient-start"].$value,
  gradientMid: brandGroup["gradient-mid"].$value,
  gradientEnd: brandGroup["gradient-end"].$value,
  logoBlue: brandGroup["logo-blue"].$value,
  logoGreen: brandGroup["logo-green"].$value,
  /* Wordmark sobre fondo oscuro (BRAND.md §2) */
  logoBlueOnDark: "#FFFFFF",
  logoGreenOnDark: "#7EE08A",
};

export const colors: Record<ColorMode, SemanticColors> = {
  light: semantic(raw.color.light as unknown as ColorGroup),
  dark: semantic(raw.color.dark as unknown as ColorGroup),
};

export type CategoryKey =
  | "agua"
  | "luz"
  | "gas"
  | "internet"
  | "telefonia"
  | "tv-streaming"
  | "gastos-comunes"
  | "arriendo-dividendo"
  | "educacion"
  | "seguros-salud"
  | "transporte"
  | "otro";

const categoryGroup = raw.color.category as unknown as Record<
  string,
  { fg: ColorToken; bg: ColorToken }
>;

export function categoryColors(key: CategoryKey) {
  const c = categoryGroup[key] ?? categoryGroup.otro;
  return { fg: c.fg.$value, bg: c.bg.$value };
}

export const fonts = {
  display: raw.font.family.display.$value.map(quoteFamily).join(", "),
  body: raw.font.family.body.$value.map(quoteFamily).join(", "),
};

function quoteFamily(f: string) {
  return f.includes("-") || f === "sans-serif" ? f : `"${f}"`;
}

type ScaleEntry = { size: number; lineHeight: number; weight: number; family: string };
const scale = raw.font.scale as unknown as Record<string, ScaleEntry>;

export function typeScale(name: string) {
  const s = scale[name];
  return {
    fontSize: `${s.size / 16}rem`,
    lineHeight: `${s.lineHeight}px`,
    fontWeight: s.weight,
    fontFamily: s.family === "display" ? fonts.display : fonts.body,
  };
}

export const radius = {
  sm: raw.radius.sm.$value,
  md: raw.radius.md.$value,
  lg: raw.radius.lg.$value,
  xl: raw.radius.xl.$value,
};

export const elevation = {
  1: raw.elevation["1"].$value,
  2: raw.elevation["2"].$value,
  3: raw.elevation["3"].$value,
};

export const motion = {
  fast: raw.motion.duration.fast.$value,
  base: raw.motion.duration.base.$value,
  slow: raw.motion.duration.slow.$value,
  standard: raw.motion.easing.standard.$value,
};

export const breakpoints = {
  tablet: raw.breakpoint.tablet.$value,
  desktop: raw.breakpoint.desktop.$value,
  wide: raw.breakpoint.wide.$value,
};

export const touchTarget = raw.size["touch-target-min"].$value;

/*
 * Paleta de series para gráficos. BRAND.md no define una; los colores de categoría
 * fallan la separación para daltonismo (deutan ΔE < 3). Se usa la paleta categórica
 * validada del método de dataviz (orden fijo, nunca cíclica), comprobada contra
 * surface claro #FFFFFF y oscuro #16213A. Propuesta: incorporarla a tokens.json.
 */
const SERIES = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c"],
};

export function chartSeries(mode: ColorMode) {
  const c = colors[mode];
  const s = SERIES[mode];
  return {
    income: s[0],
    expense: s[1],
    savings: s[2],
    balance: s[0],
    average: c.textSecondary,
    grid: c.border,
    axis: c.borderStrong,
    label: c.textSecondary,
  };
}

/* Series por grupo: se asignan por orden alfabético del grupo, no por ranking */
export function groupSeriesPalette(mode: ColorMode): string[] {
  return SERIES[mode];
}
