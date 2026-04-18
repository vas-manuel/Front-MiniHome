import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Paper,
  Grid,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useLanguage } from "./i18n";

const GET_ME_AND_PLANS = gql`
  query {
    me {
      household {
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
    plans {
      id
      name
    }
  }
`;

const UPDATE_MY_HOUSEHOLD = gql`
  mutation UpdateMyHousehold(
    $name: String
    $planId: ID
    $currency: String
    $language: Language
  ) {
    updateMyHousehold(
      name: $name
      planId: $planId
      currency: $currency
      language: $language
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
  const { t, setLanguage: setGlobalLanguage } = useLanguage();
  const [updateMyHousehold] = useMutation(UPDATE_MY_HOUSEHOLD);

  const [householdName, setHouseholdName] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [language, setLocalLanguage] = useState("es");
  const [planId, setPlanId] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (data?.me?.household) {
      const h = data.me.household;
      setHouseholdName(h.name || "");
      setCurrency(h.currency || "CLP");
      setLocalLanguage(h.language || "es");
      setPlanId(h.plan?.id || "");
    }
  }, [data]);

  const handleUpdateHousehold = async () => {
    try {
      const response = await updateMyHousehold({
        variables: {
          name: householdName,
          currency,
          language,
          planId: planId || null,
        },
      });

      // ✅ Actualizar idioma global inmediatamente
      setGlobalLanguage(language as any);

      // ✅ Persistir en localStorage
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.language = language;
      localStorage.setItem("user", JSON.stringify(storedUser));

      setSuccess(true);
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <Typography>{t("loading") || "Cargando..."}</Typography>;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {t("settings")}
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={3}>
        {t("updateHouseholdDescription") ||
          "Personaliza los datos principales de tu hogar y plan activo."}
      </Typography>

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
          background: "linear-gradient(145deg, #f8fafc, #ffffff)",
          border: "1px solid #e0e0e0",
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

          <TextField
            select
            label={t("plan") || "Plan"}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">
              {t("noPlan") || "Sin Plan"}
            </MenuItem>

            {data?.plans?.length ? (
              data.plans.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                  {p.id === data?.me?.household?.plan?.id
                    ? ` (${t("current") || "Actual"})`
                    : ""}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>
                {t("loading") || "Cargando..."}
              </MenuItem>
            )}
          </TextField>

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <TextField
            select
            label={t("currency") || "Moneda"}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            fullWidth
          >
            <MenuItem value="CLP">CLP</MenuItem>
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="EUR">EUR</MenuItem>
          </TextField>

            <TextField
              select
              label={t("language") || "Idioma"}
              value={language}
              onChange={(e) => setLocalLanguage(e.target.value)}
              fullWidth
              helperText={
                t("selectLanguage") ||
                "Selecciona el idioma de la plataforma"
              }
            >
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="pt">Português</MenuItem>
            </TextField>
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
