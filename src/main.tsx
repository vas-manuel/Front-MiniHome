import React from "react";
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
import { ColorModeProvider } from "./brand/ColorMode";
import { GoogleOAuthProvider } from "@react-oauth/google";
/* ✅ Autenticación basada en cookies httpOnly */

let API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:3030/graphql";

// ✅ Asegurar que siempre apunte a /graphql
if (!API_URL.endsWith("/graphql")) {
  API_URL = API_URL.replace(/\/+$/, "") + "/graphql";
}

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

  // ✅ Redirigir a login (evitando bucle si ya estamos ahí)
  if (shouldRedirect && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
});

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <LanguageProvider>
          <ColorModeProvider>
            <App />
          </ColorModeProvider>
        </LanguageProvider>
      </GoogleOAuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
