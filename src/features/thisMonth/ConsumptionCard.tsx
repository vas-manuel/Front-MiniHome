/*
 * Inicio: consumo del mes por categoría (con presupuesto) y el presupuesto mensual del hogar
 * comparado con cuentas fijas + consumo.
 */
import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { Box, Button, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import ShoppingBasketRounded from "@mui/icons-material/ShoppingBasketRounded";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { ConsumptionSummary, HOME_CONSUMPTION } from "../consumption/queries";
import { budgetLevel } from "../consumption/purchaseForm";

const SHOWN_CATEGORIES = 4;

const barColor = (level: ReturnType<typeof budgetLevel>) => (level === "over" ? "error" : level === "warning" ? "warning" : "primary");

export function ConsumptionCard({ year, month, fixedTotal }: { year: number; month: number; fixedTotal: number }) {
  const { t, money } = useLanguage();
  const navigate = useNavigate();
  const { data } = useQuery<{
    me: { household: { monthlyBudget: number | null } | null } | null;
    consumptionSummary: Pick<ConsumptionSummary, "total" | "categories">;
  }>(HOME_CONSUMPTION, { variables: { year, month }, fetchPolicy: "cache-and-network" });

  if (!data) return null;
  const consumption = data.consumptionSummary.total;
  const budget = Number(data.me?.household?.monthlyBudget || 0) || null;
  const spent = fixedTotal + consumption;
  const level = budgetLevel(spent, budget);
  const top = data.consumptionSummary.categories.slice(0, SHOWN_CATEGORIES);

  return (
    <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 } }} component="section" aria-labelledby="home-consumption">
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
        <Typography id="home-consumption" variant="subtitle2" component="h2" sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {t("homeConsumptionTitle")}
        </Typography>
        <Typography sx={{ ...amountSx, fontWeight: 700, fontSize: 20 }}>{money(consumption)}</Typography>
      </Stack>

      {top.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {t("homeConsumptionEmpty")}
        </Typography>
      ) : (
        <Stack spacing={1.25} sx={{ mb: 1 }}>
          {top.map((c) => {
            const b = c.category.monthlyBudget;
            const lv = budgetLevel(c.total, b);
            const pct = b ? Math.min((c.total / b) * 100, 100) : consumption > 0 ? (c.total / consumption) * 100 : 0;
            return (
              <Box key={c.category.id}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{c.category.name}</Typography>
                  <Typography variant="body2" sx={amountSx} color={lv === "over" ? "error.main" : undefined}>
                    {money(c.total)}
                    {b ? ` ${t("budgetOf", { budget: money(b) })}` : ""}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct} color={barColor(lv)} sx={{ height: 6, borderRadius: 3 }} aria-label={c.category.name} />
              </Box>
            );
          })}
        </Stack>
      )}

      {budget && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography fontWeight={600}>{t("homeBudgetTitle")}</Typography>
            <Typography sx={amountSx} color={level === "over" ? "error.main" : undefined} fontWeight={600}>
              {money(spent)} {t("budgetOf", { budget: money(budget) })}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min((spent / budget) * 100, 100)}
            color={barColor(level)}
            sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
            aria-label={t("homeBudgetTitle")}
          />
          <Typography variant="caption" color="text.secondary">
            {t("homeBudgetDetail", { fixed: money(fixedTotal), consumption: money(consumption) })}
            {level === "over" ? ` · ${t("budgetOver", { value: money(spent - budget) })}` : ` · ${t("budgetLeft", { value: money(budget - spent) })}`}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 1.5 }}>
        <Button size="small" startIcon={<ShoppingBasketRounded />} onClick={() => navigate("/consumption")}>
          {t("homeConsumptionOpen")}
        </Button>
      </Box>
    </Paper>
  );
}
