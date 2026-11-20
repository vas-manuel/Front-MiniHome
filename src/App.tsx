import { Suspense, useEffect, useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import { Box, Button, CircularProgress, Paper } from "@mui/material";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import AuthScreen from "./auth/AuthScreen";
import { AppShell } from "./app/AppShell";
import { routesFor } from "./app/routes";
import { Session, SessionContext, SessionUser } from "./app/session";
import { EmptyState } from "./components/common";
import { getEffectivePermissions } from "./permissions";
import { useLanguage } from "./i18n";

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      role
      household {
        id
        name
        language
        currency
        plan {
          name
        }
      }
    }
  }
`;

function FullPageLoader() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <CircularProgress aria-label="Cargando" />
    </Box>
  );
}

export default function App() {
  const { data, loading } = useQuery<{ me: SessionUser | null }>(ME_QUERY);
  const { setHouseholdPreferences } = useLanguage();
  const me = data?.me ?? null;

  // Idioma y moneda vienen del hogar (constitución, principio V)
  useEffect(() => {
    if (me?.household) {
      setHouseholdPreferences({ language: me.household.language, currency: me.household.currency });
    }
  }, [me, setHouseholdPreferences]);

  if (loading) return <FullPageLoader />;
  if (!me) {
    // reCAPTCHA solo se carga en la pantalla de acceso (su sello no tapa la app)
    return (
      <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
        <AuthScreen />
      </GoogleReCaptchaProvider>
    );
  }

  return (
    <BrowserRouter>
      <MainApp me={me} />
    </BrowserRouter>
  );
}

function MainApp({ me }: { me: SessionUser }) {
  const session = useMemo<Session>(() => {
    const plan = me.household?.plan?.name || "FULL";
    const permissions = getEffectivePermissions(me.role, plan);
    return {
      user: me,
      plan,
      permissions,
      isAdmin: me.role === "ADMIN" || me.role === "SYSTEM_ADMIN",
      can: (p: string) => permissions.includes(p),
    };
  }, [me]);

  const routes = useMemo(() => routesFor(me.role), [me.role]);

  return (
    <SessionContext.Provider value={session}>
      <AppShell routes={routes}>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            {routes.map(({ path, permission, Component }) => (
              <Route
                key={path}
                path={path}
                element={session.can(permission) ? <Component /> : <Navigate to="/no-access" replace />}
              />
            ))}
            <Route path="/dashboard" element={<Navigate to="/analysis" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/no-access" element={<StatusPage kind="noAccess" />} />
            <Route path="*" element={<StatusPage kind="notFound" />} />
          </Routes>
        </Suspense>
      </AppShell>
    </SessionContext.Provider>
  );
}

function StatusPage({ kind }: { kind: "noAccess" | "notFound" }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <Paper sx={{ mt: 2 }}>
      <EmptyState
        title={kind === "noAccess" ? t("noAccess") : t("notFound")}
        description={kind === "noAccess" ? t("noAccessHint") : undefined}
        action={
          <Button variant="contained" onClick={() => navigate("/")}>
            {t("goHome")}
          </Button>
        }
      />
    </Paper>
  );
}
