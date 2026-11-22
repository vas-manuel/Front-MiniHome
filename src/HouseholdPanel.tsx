import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Paper,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./i18n";
import { PLANS_PATH, usePlanLabel } from "./features/plans/planLimit";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  ENABLED_CURRENCIES,
  ENABLED_LANGUAGES,
  enabledCurrency,
  enabledLanguage,
  LANGUAGE_NAMES,
} from "./config/market";
import { formatAmountInput, parseAmountInput } from "./features/bills/billsLogic";

const GET_ME_AND_PLANS = gql`
  query HouseholdSettings {
    me {
      household {
        id
        name
        currency
        language
        monthlyBudget
        savingsGoal
        plan {
          id
          name
        }
      }
    }
  }
`;

const UPDATE_MY_HOUSEHOLD = gql`
  mutation UpdateMyHousehold(
    $name: String
    $currency: String
    $language: Language
    $monthlyBudget: Float
    $savingsGoal: Float
  ) {
    updateMyHousehold(
      name: $name
      currency: $currency
      language: $language
      monthlyBudget: $monthlyBudget
      savingsGoal: $savingsGoal
    ) {
      id
      name
      currency
      language
      plan {
        id
        name
      }
    }
  }
`;

export default function HouseholdPanel() {
  const { data, loading, refetch } = useQuery(GET_ME_AND_PLANS);
  const { t, setLanguage: setGlobalLanguage, setHouseholdPreferences } = useLanguage();
  const [updateMyHousehold] = useMutation(UPDATE_MY_HOUSEHOLD);
  const navigate = useNavigate();
  const planLabel = usePlanLabel();

  const [householdName, setHouseholdName] = useState("");
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [language, setLocalLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.me?.household) {
      const h = data.me.household;
      setHouseholdName(h.name || "");
      setCurrency(enabledCurrency(h.currency));
      setLocalLanguage(enabledLanguage(h.language));
      setMonthlyBudget(h.monthlyBudget ? formatAmountInput(String(Math.round(h.monthlyBudget))) ?? "" : "");
      setSavingsGoal(h.savingsGoal ? formatAmountInput(String(Math.round(h.savingsGoal))) ?? "" : "");
    }
  }, [data]);

  const handleUpdateHousehold = async () => {
    try {
      const response = await updateMyHousehold({
        variables: {
          name: householdName,
          currency,
          language,
          monthlyBudget: monthlyBudget ? parseAmountInput(monthlyBudget) : null,
          savingsGoal: savingsGoal ? parseAmountInput(savingsGoal) : null,
        },
      });

      // ✅ Actualizar idioma global inmediatamente
      setGlobalLanguage(enabledLanguage(language));

      setHouseholdPreferences({ language, currency });
      setError(null);
      setSuccess(true);
      refetch();
    } catch (err: any) {
      setSuccess(false);
      setError(t("genericError"));
    }
  };

  if (loading) return <Typography>{t("loading") || "Cargando..."}</Typography>;

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {t("settings")}
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={3}>
        {t("updateHouseholdDescription") ||
          "Personaliza los datos principales de tu hogar y plan activo."}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t("settingsUpdated") ||
            "Configuración actualizada correctamente ✅"}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
        }}
      >
        <Stack spacing={3}>
          <TextField
            label={t("name")}
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            fullWidth
            variant="outlined"
          />

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("settingsPlanLabel")}
              </Typography>
              <Typography fontWeight={600}>{planLabel(data?.me?.household?.plan?.name)}</Typography>
            </Box>
            <Button variant="outlined" onClick={() => navigate(PLANS_PATH)} sx={{ textTransform: "none" }}>
              {t("settingsPlanManage")}
            </Button>
          </Stack>

          {/* Idioma y moneda: ocultos mientras solo esté habilitado Chile (config/market.ts) */}
          {(ENABLED_CURRENCIES.length > 1 || ENABLED_LANGUAGES.length > 1) && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              {ENABLED_CURRENCIES.length > 1 && (
                <TextField select label={t("currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} fullWidth>
                  {ENABLED_CURRENCIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {ENABLED_LANGUAGES.length > 1 && (
                <TextField
                  select
                  label={t("language")}
                  value={language}
                  onChange={(e) => setLocalLanguage(e.target.value)}
                  fullWidth
                  helperText={t("selectLanguage")}
                >
                  {ENABLED_LANGUAGES.map((l) => (
                    <MenuItem key={l} value={l}>
                      {LANGUAGE_NAMES[l]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <TextField
              label={t("savingsGoal")}
              value={savingsGoal}
              onChange={(e) => {
                const v = formatAmountInput(e.target.value);
                if (v !== null) setSavingsGoal(v);
              }}
              helperText={t("savingsGoalHelp")}
              inputProps={{ inputMode: "numeric", style: { fontVariantNumeric: "tabular-nums" } }}
              fullWidth
            />
            <TextField
              label={t("monthlyBudget")}
              value={monthlyBudget}
              onChange={(e) => {
                const v = formatAmountInput(e.target.value);
                if (v !== null) setMonthlyBudget(v);
              }}
              helperText={t("monthlyBudgetHelp")}
              inputProps={{ inputMode: "numeric", style: { fontVariantNumeric: "tabular-nums" } }}
              fullWidth
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            size="large"
            sx={{
              px: 4,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: "bold",
            }}
            onClick={handleUpdateHousehold}
          >
            {t("save") || "Save"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
