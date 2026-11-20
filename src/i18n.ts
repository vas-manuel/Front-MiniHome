import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import es from "./locales/es";
import en from "./locales/en";
import pt from "./locales/pt";
import { formatMoney } from "./utils/format";

export type Language = "es" | "en" | "pt";
type Vars = Record<string, string | number>;

const translations: Record<Language, Record<string, string>> = { es, en, pt };

const localeMap: Record<Language, string> = {
  es: "es-CL",
  en: "en-US",
  pt: "pt-BR",
};

function normalizeLanguage(value?: string | null): Language {
  return value === "en" || value === "pt" ? value : "es";
}

function translate(lang: Language, key: string, vars?: Vars) {
  const template = translations[lang][key] ?? translations.es[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

/* =========================
   CONTEXTO: idioma y moneda del hogar (constitución, principio V)
========================= */

interface LanguageContextProps {
  language: Language;
  currency: string;
  locale: string;
  setLanguage: (lang: Language) => void;
  setHouseholdPreferences: (prefs: { language?: string | null; currency?: string | null }) => void;
  t: (key: string, vars?: Vars) => string;
  money: (value: number | null | undefined) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("es");
  const [currency, setCurrency] = useState<string>("CLP");

  const setLanguage = useCallback((lang: Language) => setLanguageState(normalizeLanguage(lang)), []);

  const setHouseholdPreferences = useCallback(
    (prefs: { language?: string | null; currency?: string | null }) => {
      if (prefs.language) setLanguageState(normalizeLanguage(prefs.language));
      if (prefs.currency) setCurrency(prefs.currency);
    },
    []
  );

  const value = useMemo<LanguageContextProps>(() => {
    const locale = localeMap[language];
    return {
      language,
      currency,
      locale,
      setLanguage,
      setHouseholdPreferences,
      t: (key, vars) => translate(language, key, vars),
      money: (v) => formatMoney(v, currency, locale),
    };
  }, [language, currency, setLanguage, setHouseholdPreferences]);

  return React.createElement(LanguageContext.Provider, { value }, children);
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

/* Compatibilidad con código antiguo: usa el contexto si existe */
export function useTranslate(language?: string) {
  const ctx = useContext(LanguageContext);
  const lang: Language = ctx?.language ?? normalizeLanguage(language);
  const t = (key: string, vars?: Vars) => translate(lang, key, vars);
  return { t, lang };
}
