/*
 * Mercado actual: Chile. La plataforma se muestra solo en español y con montos en pesos chilenos.
 * Las traducciones en.ts y pt.ts se conservan en src/locales: para expandir, agrega el idioma o la
 * moneda aquí (y en el Backend, src/config/market.ts). Con más de una opción habilitada, la
 * configuración del hogar vuelve a mostrar los selectores de idioma y moneda.
 */
export const ENABLED_LANGUAGES = ["es"] as const;
export const ENABLED_CURRENCIES = ["CLP"] as const;

export type EnabledLanguage = (typeof ENABLED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: EnabledLanguage = ENABLED_LANGUAGES[0];
export const DEFAULT_CURRENCY = ENABLED_CURRENCIES[0];

/** Nombre de cada idioma en su propio idioma (para el selector, cuando haya más de uno) */
export const LANGUAGE_NAMES: Record<string, string> = { es: "Español", en: "English", pt: "Português" };

export function enabledLanguage(value?: string | null): EnabledLanguage {
  return (ENABLED_LANGUAGES as readonly string[]).includes(value ?? "") ? (value as EnabledLanguage) : DEFAULT_LANGUAGE;
}

export function enabledCurrency(value?: string | null): string {
  return (ENABLED_CURRENCIES as readonly string[]).includes(value ?? "") ? value! : DEFAULT_CURRENCY;
}
