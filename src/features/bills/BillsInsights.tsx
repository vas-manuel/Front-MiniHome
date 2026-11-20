import { Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { last13Months, variableSummary } from "./billsLogic";

type Amount = { year: number; month: number; amount: number };

/* Resumen de cuentas de consumo (mismo cálculo que la versión anterior) */
export function VariableSummaryCards({
  yearAmounts,
  allAmounts,
  formMonth,
  year,
}: {
  yearAmounts: Amount[];
  allAmounts: Amount[];
  formMonth: number;
  year: number;
}) {
  const { t, money } = useLanguage();
  const s = variableSummary(yearAmounts, allAmounts, formMonth, year);
  const up = s.variation > 0;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2">{t("monthlyTotal")}</Typography>
        <Typography variant="h6" component="p" sx={amountSx}>
          {money(s.monthlyTotal)}
        </Typography>
        {s.prevMonthTotal > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: up ? "error.main" : "success.main" }}>
            {up ? <ArrowUpwardRounded fontSize="small" aria-hidden /> : <ArrowDownwardRounded fontSize="small" aria-hidden />}
            <Typography variant="body2" sx={amountSx}>
              {t("vsPrevMonth", { pct: s.variation.toFixed(1) })}
            </Typography>
          </Stack>
        )}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2">{t("annualTotal", { year })}</Typography>
        <Typography variant="h6" component="p" sx={amountSx}>
          {money(s.annualTotal)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={amountSx}>
          {t("monthlyAverage", { value: money(s.monthlyAverage) })}
        </Typography>
      </Paper>
    </Box>
  );
}

/* Barras horizontales de los últimos 13 meses: legibles en móvil y con el valor siempre visible */
export function AmountHistory({ allAmounts }: { allAmounts: Amount[] }) {
  const { t, money, locale } = useLanguage();
  const theme = useTheme();
  const months = last13Months(allAmounts);
  const max = Math.max(...months.map((m) => m.value), 1);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {t("history13")}
      </Typography>
      <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {months.map((m) => {
          const label = new Date(m.year, m.month - 1, 1)
            .toLocaleDateString(locale, { month: "short", year: "2-digit" })
            .replace(".", "");
          return (
            <Box component="li" key={`${m.year}-${m.month}`} sx={{ display: "grid", gridTemplateColumns: "64px 1fr auto", alignItems: "center", gap: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Box sx={{ height: 12, borderRadius: 6, bgcolor: "background.default" }}>
                <Box
                  sx={{
                    width: `${(m.value / max) * 100}%`,
                    height: "100%",
                    borderRadius: 6,
                    bgcolor: theme.palette.primary.main,
                    transition: "width 200ms",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ ...amountSx, minWidth: 88, textAlign: "right" }}>
                {money(m.value)}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
