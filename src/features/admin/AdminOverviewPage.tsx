/*
 * Resumen del negocio: ingresos recurrentes, suscripciones, estados de los hogares, cambios de plan,
 * crecimiento por mes y uso de IA. Los montos van en CLP con IVA incluido salvo que se indique.
 */
import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { PageHeader } from "../../components/common";
import { LineChart } from "../../components/LineChart";
import { groupSeriesPalette } from "../../brand/tokens";
import { amountSx } from "../../brand/theme";
import { useLanguage } from "../../i18n";
import { usePlanLabel } from "../plans/planLimit";
import { ADMIN_OVERVIEW } from "./queries";
import { ADMIN_STATES, AdminState, clp, monthLabel, pct, usd } from "./adminFormat";

export default function AdminOverviewPage() {
  const { t, locale } = useLanguage();
  const planLabel = usePlanLabel();
  const navigate = useNavigate();
  const theme = useTheme();
  const palette = groupSeriesPalette(theme.palette.mode);
  const { data, loading, error } = useQuery(ADMIN_OVERVIEW, { fetchPolicy: "cache-and-network" });
  const [growthTable, setGrowthTable] = useState(false);

  if (loading && !data) {
    return (
      <Box>
        <PageHeader title={t("adminOverviewTitle")} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }
  if (error || !data) {
    return (
      <Box>
        <PageHeader title={t("adminOverviewTitle")} />
        <Alert severity="error">{t("genericError")}</Alert>
      </Box>
    );
  }

  const m = data.adminBusinessMetrics;
  const money = (v: number) => clp(v, locale);
  const [prevMonth, thisMonth] = data.adminFinanceReport as { month: string; gross: number; profit: number }[];
  const growth: { month: string; newHouseholds: number; newSubscriptions: number; cancellations: number }[] = data.adminGrowth;
  const rate = data.adminFinanceSettings.usdToClp;

  const stateCount: Record<AdminState, number> = {
    PAYING: m.paying,
    PAST_DUE: m.pastDue,
    CANCELING: m.canceling,
    TRIAL: m.trial,
    COMPLIMENTARY: m.complimentary,
    FREE: m.free,
    INACTIVE: m.inactive,
  };
  const maxState = Math.max(1, ...Object.values(stateCount));

  return (
    <Box>
      <PageHeader title={t("adminOverviewTitle")} subtitle={t("adminOverviewSubtitle")} />

      {(m.pastDue > 0 || m.trialsEndingSoon > 0) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {m.pastDue > 0 && (
            <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => navigate("/households?estado=PAST_DUE")}>{t("adminSee")}</Button>}>
              {t("adminAlertPastDue", { n: m.pastDue })}
            </Alert>
          )}
          {m.trialsEndingSoon > 0 && (
            <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => navigate("/households?estado=TRIAL")}>{t("adminSee")}</Button>}>
              {t("adminAlertTrials", { n: m.trialsEndingSoon })}
            </Alert>
          )}
        </Stack>
      )}

      {/* Lo principal en una fila */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Kpi label={t("adminMrr")} value={money(m.mrr)} caption={t("adminNetMrr", { value: money(m.netMrr) })} />
        <Kpi label={t("adminArr")} value={money(m.arr)} caption={t("adminArpu", { value: money(m.arpu) })} />
        <Kpi
          label={t("adminActiveSubs")}
          value={String(m.activeSubscriptions)}
          caption={t("adminMonthlyYearly", { monthly: m.monthlySubscriptions, yearly: m.yearlySubscriptions })}
        />
        <Kpi
          label={t("adminProfitThisMonth")}
          value={money(thisMonth?.profit ?? 0)}
          caption={t("adminGrossThisMonth", { value: money(thisMonth?.gross ?? 0), prev: money(prevMonth?.gross ?? 0) })}
          tone={(thisMonth?.profit ?? 0) < 0 ? "danger" : undefined}
          onClick={() => navigate("/financial")}
        />
        <Kpi
          label={t("adminHouseholds")}
          value={String(m.totalHouseholds)}
          caption={t("adminNewThisMonth", { n: m.newHouseholdsThisMonth })}
          onClick={() => navigate("/households")}
        />
        <Kpi
          label={t("adminConversion")}
          value={pct(m.conversionRate, locale)}
          caption={t("adminChurn", { n: m.canceledLast30Days, pct: pct(m.churnRate, locale) })}
        />
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Hogares por estado: una barra por estado (magnitud, un solo color) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {t("adminByState")}
            </Typography>
            <Stack spacing={1.25}>
              {ADMIN_STATES.map((s) => (
                <Box
                  key={s}
                  component="button"
                  onClick={() => navigate(`/households?estado=${s}`)}
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 40px",
                    alignItems: "center",
                    gap: 1.5,
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                    "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}` },
                  }}
                >
                  <Typography variant="body2">{t(`adminState_${s}`)}</Typography>
                  <Box sx={{ height: 12, bgcolor: "action.hover", borderRadius: "4px", overflow: "hidden" }}>
                    <Box sx={{ width: `${(stateCount[s] / maxState) * 100}%`, height: "100%", bgcolor: palette[0], borderRadius: "4px" }} />
                  </Box>
                  <Typography variant="body2" fontWeight={600} textAlign="right" sx={amountSx}>
                    {stateCount[s]}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Cambios de plan */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
            <Typography variant="h6" component="h2">
              {t("adminPlanChanges")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("adminPlanChangesHint", { n: m.planChanges.households })}
            </Typography>
            <Grid container spacing={2}>
              <Mini label={t("adminChangesTotal")} value={m.planChanges.total} caption={t("adminLast30", { n: m.planChanges.last30Days })} />
              <Mini label={t("adminUpgrades")} value={m.planChanges.upgrades} />
              <Mini label={t("adminDowngrades")} value={m.planChanges.downgrades} />
              <Mini label={t("adminPeriodChanges")} value={m.planChanges.periodChanges} />
            </Grid>
            <Typography variant="subtitle2" sx={{ mt: 3 }}>
              {t("adminAiTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("adminAiLine", {
                reads: m.aiReadsThisMonth,
                usd: usd(m.aiCostThisMonthUsd, locale),
                clp: money(m.aiCostThisMonthUsd * rate),
                per: m.aiReadsThisMonth ? usd(m.aiCostThisMonthUsd / m.aiReadsThisMonth, locale) : "—",
              })}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Por plan */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {t("adminByPlan")}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("plan")}</TableCell>
                <TableCell align="right">{t("adminHouseholds")}</TableCell>
                <TableCell align="right">{t("adminPaying")}</TableCell>
                <TableCell align="right">{t("plansMonthly")}</TableCell>
                <TableCell align="right">{t("plansYearly")}</TableCell>
                <TableCell align="right">{t("adminState_TRIAL")}</TableCell>
                <TableCell align="right">{t("adminState_COMPLIMENTARY")}</TableCell>
                <TableCell align="right">{t("adminMrr")}</TableCell>
                <TableCell align="right">{t("adminAiReads")}</TableCell>
                <TableCell align="right">{t("adminAiCost")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {m.byPlan.map((p: any) => (
                <TableRow key={p.planId}>
                  <TableCell>{planLabel(p.planName)}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.households}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.paying}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.monthly}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.yearly}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.trial}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.complimentary}</TableCell>
                  <TableCell align="right" sx={amountSx}>{money(p.mrr)}</TableCell>
                  <TableCell align="right" sx={amountSx}>{p.aiReadsThisMonth}</TableCell>
                  <TableCell align="right" sx={amountSx}>{usd(p.aiCostThisMonthUsd, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Crecimiento: misma unidad (cantidad), una sola escala */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" component="h2">
            {t("adminGrowth")}
          </Typography>
          <Button size="small" onClick={() => setGrowthTable((v) => !v)}>
            {growthTable ? t("viewChart") : t("viewTable")}
          </Button>
        </Stack>
        {growthTable ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("month")}</TableCell>
                  <TableCell align="right">{t("adminNewHouseholds")}</TableCell>
                  <TableCell align="right">{t("adminNewSubs")}</TableCell>
                  <TableCell align="right">{t("adminCancellations")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...growth].reverse().map((g) => (
                  <TableRow key={g.month}>
                    <TableCell sx={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{monthLabel(g.month, locale)}</TableCell>
                    <TableCell align="right" sx={amountSx}>{g.newHouseholds}</TableCell>
                    <TableCell align="right" sx={amountSx}>{g.newSubscriptions}</TableCell>
                    <TableCell align="right" sx={amountSx}>{g.cancellations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <LineChart
            labels={growth.map((g) => monthLabel(g.month, locale, true))}
            series={[
              { key: "h", label: t("adminNewHouseholds"), color: palette[0], values: growth.map((g) => g.newHouseholds) },
              { key: "s", label: t("adminNewSubs"), color: palette[1], values: growth.map((g) => g.newSubscriptions) },
              { key: "c", label: t("adminCancellations"), color: palette[2], values: growth.map((g) => g.cancellations) },
            ]}
            formatValue={(v) => String(Math.round(v))}
            locale={locale}
            markerIndex={growth.length - 1}
            ariaLabel={t("adminGrowth")}
          />
        )}
      </Paper>
    </Box>
  );
}

function Kpi({
  label,
  value,
  caption,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "danger";
  onClick?: () => void;
}) {
  return (
    <Grid size={{ xs: 6, md: 4, lg: 2 }}>
      <Paper
        onClick={onClick}
        sx={{ p: 2, height: "100%", cursor: onClick ? "pointer" : "default", "&:hover": onClick ? { bgcolor: "action.hover" } : undefined }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" component="p" sx={{ ...amountSx, color: tone === "danger" ? "error.main" : undefined }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
      </Paper>
    </Grid>
  );
}

function Mini({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <Grid size={{ xs: 6, sm: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" component="p" sx={amountSx}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Grid>
  );
}
