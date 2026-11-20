import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "./theme";
import type { ColorMode } from "./tokens";

const STORAGE_KEY = "themeMode";

type ColorModeContextValue = { mode: ColorMode; toggleColorMode: () => void };

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "light",
  toggleColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

function readInitialMode(): ColorMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* almacenamiento bloqueado: usar preferencia del sistema */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* Respeta la elección guardada; si no hay, sigue prefers-color-scheme (tokens.css) */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(readInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    const theme = createAppTheme(mode);
    meta?.setAttribute("content", theme.palette.background.default);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        const next: ColorMode = mode === "light" ? "dark" : "light";
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* sin persistencia */
        }
        setMode(next);
      },
    }),
    [mode]
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
