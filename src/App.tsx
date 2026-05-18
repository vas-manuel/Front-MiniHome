import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { GoogleLogin } from "@react-oauth/google";
import { useState, lazy, Suspense } from "react";
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";

import LayoutBase from "./LayoutBase";
import { getEffectivePermissions } from "./permissions";
import { useTranslate } from "./i18n";

/* =======================
   LAZY LOADING
======================= */

const DashboardGlobal = lazy(() => import("./DashboardGlobal"));
const BillStructureManager = lazy(() => import("./BillStructureManager"));
const BillAccountsManager = lazy(() => import("./BillAccountsManager"));
const HouseholdUsersManager = lazy(() => import("./HouseholdUsersManager"));
const HouseholdPanel = lazy(() => import("./HouseholdPanel"));
const HouseholdIncomeManager = lazy(() => import("./HouseholdIncomeManager"));
const SavingsManager = lazy(() => import("./SavingsManager"));

const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminFinancialDashboard = lazy(() => import("./AdminFinancialDashboard"));
const AdminExecutiveBoard = lazy(() => import("./AdminExecutiveBoard"));
const ExecutiveFinancialDashboard = lazy(() => import("./ExecutiveFinancialDashboard"));
const PlanManager = lazy(() => import("./PlanManager"));
const MerchantManager = lazy(() => import("./MerchantManager"));

/* =======================
   GRAPHQL
======================= */

const LOGIN_MUTATION = gql`
  mutation Login(
    $email: String
    $password: String
    $googleIdToken: String
    $recaptchaToken: String!
  ) {
    login(
      email: $email
      password: $password
      googleIdToken: $googleIdToken
      recaptchaToken: $recaptchaToken
    ) {
      accessToken
      refreshToken
      user {
        id
        name
        role
      }
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register(
    $rut: String!
    $name: String
    $email: String
    $password: String
    $googleIdToken: String
    $recaptchaToken: String!
    $provider: Provider!
  ) {
    registerHousehold(
      rut: $rut
      name: $name
      email: $email
      password: $password
      googleIdToken: $googleIdToken
      recaptchaToken: $recaptchaToken
      provider: $provider
    )
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      role
      household {
        language
        plan {
          name
        }
      }
    }
  }
`;

/* =======================
   APP ROOT
======================= */

export default function App() {
  const { data, loading } = useQuery(ME_QUERY);

  if (loading) return null;

  if (!data?.me) return <AuthScreen />;

  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

/* =======================
   MAIN APP WITH ROUTER
======================= */

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data } = useQuery(ME_QUERY);

  const role = data?.me?.role;
  const plan = data?.me?.household?.plan?.name || "FULL";
  const language = data?.me?.household?.language || "es";

  const { t } = useTranslate(language);
  const permissions = getEffectivePermissions(role, plan);

  const isAdmin = role === "ADMIN" || role === "SYSTEM_ADMIN";

  const menuItems = isAdmin
    ? [
        { key: "/", label: "Dashboard", icon: <DashboardIcon /> },
        { key: "/financial", label: "Finanzas", icon: <AccountBalanceIcon /> },
        { key: "/executive", label: "Ejecutivo", icon: <DashboardIcon /> },
        { key: "/plans", label: "Planes", icon: <SettingsIcon /> },
        ...(role === "SYSTEM_ADMIN"
          ? [{ key: "/merchants", label: "Empresas", icon: <SettingsIcon /> }]
          : []),
      ]
    : [
        { key: "/", label: "Dashboard", icon: <DashboardIcon /> },
        { key: "/accounts", label: "Estructura", icon: <AccountBalanceIcon /> },
        { key: "/bills", label: "Montos", icon: <AccountBalanceIcon /> },
        { key: "/incomes", label: "Ingresos", icon: <AccountBalanceIcon /> },
        { key: "/savings", label: "Ahorro", icon: <AccountBalanceIcon /> },
        { key: "/users", label: "Usuarios", icon: <PeopleIcon /> },
        { key: "/settings", label: "Configuración", icon: <SettingsIcon /> },
      ];

  const disabledKeys = menuItems
    .filter((item) => !permissions.includes(routeToPermission(item.key)))
    .map((item) => item.key);

  function routeToPermission(path: string) {
    switch (path) {
      case "/":
        return "dashboard";
      case "/accounts":
        return "accounts";
      case "/bills":
        return "bills";
      case "/incomes":
        return "householdSettings";
      case "/savings":
        return "householdSettings";
      case "/users":
        return "users";
      case "/settings":
        return "householdSettings";
      case "/financial":
        return "financial";
      case "/executive":
        return "executive";
      case "/plans":
        return "plans";
      default:
        return "";
    }
  }

  return (
    <LayoutBase
      user={data?.me}
      title={isAdmin ? "Panel Administrador" : "Plataforma"}
      roleLabel={role}
      planLabel={plan}
      menuItems={menuItems}
      disabledKeys={disabledKeys}
      activeKey={location.pathname}
      onChangeSection={(key) => navigate(key)}
      storageKey="main_drawer"
    >
      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              permissions.includes("dashboard") ? (
                isAdmin ? <AdminDashboard /> : <DashboardGlobal />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/accounts"
            element={
              permissions.includes("accounts") ? (
                <BillStructureManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/bills"
            element={
              permissions.includes("bills") ? (
                <BillAccountsManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/incomes"
            element={
              permissions.includes("householdSettings") ? (
                <HouseholdIncomeManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/savings"
            element={
              permissions.includes("householdSettings") ? (
                <SavingsManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/users"
            element={
              permissions.includes("users") ? (
                <HouseholdUsersManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/settings"
            element={
              permissions.includes("householdSettings") ? (
                <HouseholdPanel />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/financial"
            element={
              permissions.includes("financial") ? (
                <AdminFinancialDashboard />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/executive"
            element={
              permissions.includes("executive") ? (
                <ExecutiveFinancialDashboard />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/plans"
            element={
              permissions.includes("plans") ? (
                <PlanManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />

          <Route
            path="/merchants"
            element={
              role === "SYSTEM_ADMIN" ? (
                <MerchantManager />
              ) : (
                <Navigate to="/no-access" />
              )
            }
          />
          <Route
            path="/no-access"
            element={<Typography>No tienes acceso</Typography>}
          />
        </Routes>
      </Suspense>
    </LayoutBase>
  );
}

/* =======================
   AUTH
======================= */

function AuthScreen() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [login] = useMutation(LOGIN_MUTATION);
  const [register] = useMutation(REGISTER_MUTATION);

  const [mode, setMode] = useState<"login" | "register">("login");

  const [rut, setRut] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!executeRecaptcha) return;
    const recaptchaToken = await executeRecaptcha("login");

    await login({
      variables: { email, password, recaptchaToken },
    });

    window.location.reload();
  };

  const handleRegister = async () => {
    if (!executeRecaptcha) return;
    const recaptchaToken = await executeRecaptcha("register");

    await register({
      variables: {
        rut,
        name,
        email,
        password,
        recaptchaToken,
        provider: "LOCAL",
      },
    });

    alert("Registro enviado ✅ Pendiente activación.");
    setMode("login");
  };

  const handleGoogle = async (credentialResponse: any) => {
    if (!credentialResponse?.credential || !executeRecaptcha) return;

    const recaptchaToken = await executeRecaptcha("google_auth");

    if (mode === "login") {
      await login({
        variables: {
          googleIdToken: credentialResponse.credential,
          recaptchaToken,
        },
      });

      window.location.reload();
    } else {
      await register({
        variables: {
          rut,
          googleIdToken: credentialResponse.credential,
          recaptchaToken,
          provider: "GOOGLE",
        },
      });

      alert("Registro Google enviado ✅ Pendiente activación.");
      setMode("login");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Box
          component="img"
          src="/monihome-logo.png"
          alt="MoniHome"
          sx={{
            height: 80,
            mb: 3,
          }}
        />
        <Typography variant="h5" mb={3}>
          {mode === "login" ? "Iniciar Sesión" : "Registrar Hogar"}
        </Typography>

        <Stack spacing={2}>
          {mode === "register" && (
            <>
              <TextField
                label="RUT"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                fullWidth
              />
              <TextField
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
            </>
          )}

          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />

          <TextField
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
        </Stack>

        <Box mt={3}>
          {mode === "login" ? (
            <Button fullWidth variant="contained" onClick={handleLogin}>
              Ingresar
            </Button>
          ) : (
            <Button fullWidth variant="contained" onClick={handleRegister}>
              Registrar
            </Button>
          )}
        </Box>

        <Box mt={2}>
          <GoogleLogin onSuccess={handleGoogle} onError={() => {}} />
        </Box>

        <Box mt={2}>
          <Button
            fullWidth
            onClick={() =>
              setMode(mode === "login" ? "register" : "login")
            }
          >
            {mode === "login" ? "Crear cuenta" : "Volver a Login"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
