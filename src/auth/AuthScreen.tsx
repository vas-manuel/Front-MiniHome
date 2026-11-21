import { FormEvent, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { GoogleLogin } from "@react-oauth/google";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import { Logo } from "../brand/Logo";
import { useLanguage } from "../i18n";
import { ThemeToggle } from "../app/TopBarActions";

const LOGIN_MUTATION = gql`
  mutation Login($email: String, $password: String, $googleIdToken: String, $recaptchaToken: String!) {
    login(email: $email, password: $password, googleIdToken: $googleIdToken, recaptchaToken: $recaptchaToken) {
      user {
        id
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
    $visitorId: String
  ) {
    registerHousehold(
      rut: $rut
      name: $name
      email: $email
      password: $password
      googleIdToken: $googleIdToken
      recaptchaToken: $recaptchaToken
      provider: $provider
      visitorId: $visitorId
    )
  }
`;

/* Visitante anónimo del sitio monihome.cl (cookie del dominio .monihome.cl), para medir registros */
const siteVisitorId = () => document.cookie.match(/(?:^|; )mh_vid=([a-z0-9]+)/)?.[1] ?? null;

/* monihome.cl enlaza a app.monihome.cl/?registro=1 para abrir directo el registro */
const initialMode = (): "login" | "register" =>
  new URLSearchParams(window.location.search).has("registro") ? "register" : "login";

type Mode = "login" | "register";
type Message = { kind: "error" | "success"; text: string } | null;

/* Login / registro (BRAND.md §8): logo arriba, tarjeta de máx. 400 px, errores que no culpan */
export default function AuthScreen() {
  const { t } = useLanguage();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [login] = useMutation(LOGIN_MUTATION);
  const [register] = useMutation(REGISTER_MUTATION);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [rut, setRut] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const isRegister = mode === "register";

  const getCaptcha = async (action: string) => {
    if (!executeRecaptcha) throw new Error("captcha");
    return executeRecaptcha(action);
  };

  const finishLogin = () => {
    // La sesión vive en una cookie httpOnly; recargamos en la raíz para leer "me"
    window.location.href = window.location.pathname === "/login" ? "/" : window.location.href;
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
    setMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setMessage(null);
    if (!email || !password || (isRegister && !rut)) {
      setMessage({ kind: "error", text: t("requiredFields") });
      return;
    }
    setBusy(true);
    try {
      const recaptchaToken = await getCaptcha(isRegister ? "register" : "login");
      if (isRegister) {
        await register({ variables: { rut, name, email, password, recaptchaToken, provider: "LOCAL", visitorId: siteVisitorId() } });
        switchMode("login");
        setMessage({ kind: "success", text: t("registerSuccess") });
      } else {
        await login({ variables: { email, password, recaptchaToken } });
        finishLogin();
      }
    } catch (err: any) {
      const isCaptcha = err?.message === "captcha" || /recaptcha/i.test(err?.message ?? "");
      const text = isCaptcha ? t("captchaUnavailable") : isRegister ? t("genericError") : t("loginError");
      setMessage({ kind: "error", text });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) return;
    setMessage(null);
    if (isRegister && !rut) {
      setSubmitted(true);
      setMessage({ kind: "error", text: t("requiredFields") });
      return;
    }
    setBusy(true);
    try {
      const recaptchaToken = await getCaptcha("google_auth");
      if (isRegister) {
        await register({
          variables: { rut, googleIdToken: credentialResponse.credential, recaptchaToken, provider: "GOOGLE", visitorId: siteVisitorId() },
        });
        switchMode("login");
        setMessage({ kind: "success", text: t("registerSuccess") });
      } else {
        await login({ variables: { googleIdToken: credentialResponse.credential, recaptchaToken } });
        finishLogin();
      }
    } catch (err: any) {
      const isCaptcha = err?.message === "captcha" || /recaptcha/i.test(err?.message ?? "");
      setMessage({ kind: "error", text: isCaptcha ? t("captchaUnavailable") : t("genericError") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
        <ThemeToggle />
      </Box>
      <Stack alignItems="center" sx={{ flex: 1, px: 2, pb: 6 }}>
        <Box sx={{ mt: { xs: 2, sm: 6 }, mb: 3 }}>
          <Logo height={48} />
        </Box>

        <Paper component="main" elevation={1} sx={{ width: "100%", maxWidth: 400, p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" component="h1">
            {isRegister ? t("register") : t("loginTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            {isRegister ? t("registerSubtitle") : t("loginSubtitle")}
          </Typography>

          {message && (
            <Alert severity={message.kind} sx={{ mb: 2 }} role={message.kind === "error" ? "alert" : "status"}>
              {message.text}
            </Alert>
          )}

          <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <>
                <TextField
                  label={t("rut")}
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  required
                  error={submitted && !rut}
                  helperText={t("rutHelp")}
                  autoComplete="off"
                />
                <TextField label={t("name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </>
            )}
            <TextField
              label={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={submitted && !email}
              autoComplete="email"
              inputMode="email"
            />
            <TextField
              label={t("password")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={submitted && !password}
              autoComplete={isRegister ? "new-password" : "current-password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
              {isRegister ? t("registerAction") : t("enter")}
            </Button>
          </Stack>

          <Divider sx={{ my: 3, color: "text.secondary", fontSize: 12 }}>{t("orContinueWith")}</Divider>

          <Box sx={{ display: "flex", justifyContent: "center", minHeight: 44 }}>
            <GoogleLogin onSuccess={handleGoogle} onError={() => setMessage({ kind: "error", text: t("genericError") })} />
          </Box>

          <Button fullWidth sx={{ mt: 2 }} onClick={() => switchMode(isRegister ? "login" : "register")}>
            {isRegister ? t("backToLogin") : t("createAccount")}
          </Button>
        </Paper>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 2, color: "text.secondary" }}>
          <LockRounded sx={{ fontSize: 16 }} aria-hidden />
          <Typography variant="caption">{t("dataProtected")}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
