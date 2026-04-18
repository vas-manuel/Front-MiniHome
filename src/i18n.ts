import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type Language = "es" | "en" | "pt";

/* =========================
   DICCIONARIOS
========================= */

const translations: Record<Language, Record<string, string>> = {
  es: {
    login: "Iniciar Sesión",
    register: "Registrar Hogar",
    email: "Email",
    password: "Contraseña",
    name: "Nombre",
    rut: "RUT",
    createAccount: "Crear cuenta",
    backToLogin: "Volver a Login",
    welcome: "Bienvenido",
    dashboard: "Dashboard",
    finances: "Finanzas",
    executive: "Ejecutivo",
    structure: "Estructura",
    amounts: "Montos",
    users: "Usuarios",
    settings: "Configuración",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    add: "Agregar",
    month: "Mes",
    amount: "Monto",
    status: "Estado",
    actions: "Acciones",
    year: "Año",
    selectAccount: "Seleccionar Cuenta",
    importExcel: "Importar Excel",
    downloadTemplate: "Descargar Formato",
    amountManagement: "Gestión de Montos"
  },
  en: {
    login: "Sign In",
    register: "Register Household",
    email: "Email",
    password: "Password",
    name: "Name",
    rut: "Tax ID",
    createAccount: "Create account",
    backToLogin: "Back to Login",
    welcome: "Welcome",
    dashboard: "Dashboard",
    finances: "Finances",
    executive: "Executive",
    structure: "Structure",
    amounts: "Amounts",
    users: "Users",
    settings: "Settings",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    add: "Add",
    month: "Month",
    amount: "Amount",
    status: "Status",
    actions: "Actions",
    year: "Year",
    selectAccount: "Select Account",
    importExcel: "Import Excel",
    downloadTemplate: "Download Template",
    amountManagement: "Amount Management"
  },
  pt: {
    login: "Entrar",
    register: "Registrar Casa",
    email: "Email",
    password: "Senha",
    name: "Nome",
    rut: "Documento",
    createAccount: "Criar conta",
    backToLogin: "Voltar ao Login",
    welcome: "Bem-vindo",
    dashboard: "Painel",
    finances: "Finanças",
    executive: "Executivo",
    structure: "Estrutura",
    amounts: "Valores",
    users: "Usuários",
    settings: "Configurações",
    save: "Salvar",
    cancel: "Cancelar",
    delete: "Excluir",
    add: "Adicionar",
    month: "Mês",
    amount: "Valor",
    status: "Status",
    actions: "Ações",
    year: "Ano",
    selectAccount: "Selecionar Conta",
    importExcel: "Importar Excel",
    downloadTemplate: "Baixar Modelo",
    amountManagement: "Gestão de Valores"
  }
};

/* =========================
   CONTEXTO GLOBAL
========================= */

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  locale: string;
}

const localeMap: Record<Language, string> = {
  es: "es-CL",
  en: "en-US",
  pt: "pt-BR"
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("es");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser?.language) {
      setLanguage(storedUser.language);
    }
  }, []);

  const t = useMemo(() => {
    return (key: string) =>
      translations[language][key] || key;
  }, [language]);

  const value: LanguageContextProps = {
    language,
    setLanguage,
    t,
    locale: localeMap[language]
  };

  return React.createElement(
    LanguageContext.Provider,
    { value },
    children
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

/* ✅ Compatibilidad temporal con código antiguo */
export function useTranslate(language?: string) {
  const lang: Language =
    language === "en" || language === "pt" ? language : "es";

  const t = (key: string) =>
    translations[lang][key] || key;

  return { t, lang };
}
