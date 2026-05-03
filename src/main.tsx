import React, { useMemo, useState, createContext } from "react";
import ReactDOM from "react-dom/client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  createHttpLink,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import App from "./App";
import { LanguageProvider } from "./i18n";
import {
  ThemeProvider,
  CssBaseline,
  createTheme,
} from "@mui/material";
import baseTheme from "./theme";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
/* ✅ Autenticación ahora basada en cookies httpOnly */

/* =======================
   DARK MODE CONTEXT
======================= */

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

const API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:3030/graphql";

const httpLink = createHttpLink({
  uri: API_URL,
  credentials: "include",
});

/* 🔐 Ya no usamos Authorization header.
   Autenticación basada en cookies httpOnly */

const errorLink = onError(({ graphQLErrors, networkError }) => {
  let shouldRedirect = false;

  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === "UNAUTHENTICATED") {
        shouldRedirect = true;
      }
    }
  }

  if (networkError && "statusCode" in networkError) {
    // @ts-ignore
    if (networkError.statusCode === 401) {
      shouldRedirect = true;
    }
  }

  if (shouldRedirect) {
    // ✅ Limpiar estado visual si fuera necesario
    localStorage.removeItem("themeMode");

    // ✅ Redirigir explícitamente a login
    window.location.href = "/login";
  }
});

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});

function Root() {
  const [mode, setMode] = useState<"light" | "dark">(
    (localStorage.getItem("themeMode") as "light" | "dark") || "light"
  );

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        const newMode = mode === "light" ? "dark" : "light";
        localStorage.setItem("themeMode", newMode);
        setMode(newMode);
      },
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme(baseTheme, {
        palette: {
          mode,
          background: {
            default:
              mode === "light"
                ? baseTheme.palette.background.default
                : "#0f172a",
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <GoogleReCaptchaProvider
          reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
        >
          <LanguageProvider>
            <Root />
          </LanguageProvider>
        </GoogleReCaptchaProvider>
      </GoogleOAuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
