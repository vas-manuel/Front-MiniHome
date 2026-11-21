/*
 * Finanzas: lo cobrado por mes y a dónde va (IVA, comisión del proveedor de pagos, IA, costos fijos)
 * y la ganancia que queda. Los parámetros de comisiones y costos se editan aquí (solo SYSTEM_ADMIN).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import { PageHeader } from "../../components/common";
import { StackedBarChart } from "../../components/StackedBarChart";
import { groupSeriesPalette } from "../../brand/tokens";
import { amountSx } from "../../brand/theme";
import { useLanguage } from "../../i18n";
import { useSession } from "../../app/session";
import { ADMIN_FINANCE, UPDATE_FINANCE_SETTINGS } from "./queries";
import { clp, margin, monthLabel, pct, totals } from "./adminFormat";

interface Period {
  month: string;
  payments: number;
  gross: number;
  vat: number;
  providerFees: number;
  aiCost: number;
  fixedCosts: number;
  profit: number;
}

interface FixedCost {
  name: string;
  amount: number;
  currency: "CLP" | "USD";
  since: string | null;
}

interface Settings {
  providerFeePercent: number;
  providerFeeFixed: number;
  vatRate: number;
  chargesVat: boolean;
  usdToClp: number;
  fixedCosts: FixedCost[];
}

const KEYS = ["gross", "vat", "providerFees", "aiCost", "fixedCosts", "profit", "payments"] as const;

export default function AdminFinancePage() {
  const { t, locale } = useLanguage();
  const { user } = useSession();
  const theme = useTheme();
  const palette = groupSeriesPalette(theme.palette.mode);
  const [months, setMonths] = useState(12);
  const [asTable, setAsTable] = useState(false);
  const { data, loading, error } = useQuery(ADMIN_FINANCE, { variables: { months }, fetchPolicy: "cache-and-network" });
  const periods: Period[] = data?.adminFinanceReport ?? [];
  const sum = useMemo(() => totals(periods, KEYS), [periods]);
  const money = (v: number) => clp(v, locale);
  const labels = periods.map((p) => monthLabel(p.month, locale, true));

  // Orden fijo de colores (skill dataviz): la ganancia abajo, sobre el cero
  const segments = [
    { key: "profit", label: t("adminFinProfit"), color: palette[0], values: periods.map((p) => p.profit) },
    { key: "vat", label: t("adminFinVat"), color: palette[1], values: periods.map((p) => p.vat) },
    { key: "providerFees", label: t("adminFinFees"), color: palette[2], values: periods.map((p) => p.providerFees) },
    { key: "aiCost", label: t("adminFinAi"), color: palette[3], values: periods.map((p) => p.aiCost) },
    { key: "fixedCosts", label: t("adminFinFixed"), color: palette[4], values: periods.map((p) => p.fixedCosts) },
  ];

  const current = periods[periods.length - 1];
  const previous = periods[periods.length - 2];

  return (
    <Box>
      <PageHeader
        title={t("adminFinTitle")}
        subtitle={t("adminFinSubtitle")}
        actions={
          <ToggleButtonGroup size="small" exclusive value={months} onChange={(_, v) => v && setMonths(v)} aria-label={t("adminFinRange")}>
            <ToggleButton value={6}>{t("adminMonthsN", { n: 6 })}</ToggleButton>
            <ToggleButton value={12}>{t("adminMonthsN", { n: 12 })}</ToggleButton>
            <ToggleButton value={24}>{t("adminMonthsN", { n: 24 })}</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{t("genericError")}</Alert>}

      {loading && !data ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <>
          {/* Cifras del período elegido */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Kpi label={t("adminFinGross")} value={money(sum.gross)} caption={t("adminFinPaymentsN", { n: sum.payments })} />
            <Kpi label={t("adminFinFees")} value={money(sum.providerFees)} caption={pct(sum.gross ? sum.providerFees / sum.gross : 0, locale)} />
            <Kpi label={t("adminFinVat")} value={money(sum.vat)} />
            <Kpi label={t("adminFinCosts")} value={money(sum.aiCost + sum.fixedCosts)} caption={t("adminFinCostsSplit", { ai: money(sum.aiCost), fixed: money(sum.fixedCosts) })} />
            <Kpi
              label={t("adminFinProfit")}
              value={money(sum.profit)}
              caption={t("adminFinMargin", { pct: pct(margin(sum.profit, sum.gross), locale) })}
              tone={sum.profit < 0 ? "danger" : "success"}
              strong
            />
            <Kpi
              label={t("adminFinThisMonth")}
              value={money(current?.profit ?? 0)}
              caption={previous ? t("adminFinVsPrev", { value: money(previous.profit) }) : undefined}
              tone={(current?.profit ?? 0) < 0 ? "danger" : undefined}
            />
          </Grid>

          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h6" component="h2">
                  {t("adminFinChartTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("adminFinChartHint")}
                </Typography>
              </Box>
              <Button size="small" onClick={() => setAsTable((v) => !v)}>
                {asTable ? t("viewChart") : t("viewTable")}
              </Button>
            </Stack>
            {asTable ? (
              <PeriodTable periods={periods} sum={sum} locale={locale} />
            ) : (
              <StackedBarChart
                segments={segments}
                labels={labels}
                formatValue={money}
                locale={locale}
                ariaLabel={t("adminFinChartTitle")}
                totalLabel={t("adminFinGross")}
                totals={periods.map((p) => p.gross)}
              />
            )}
          </Paper>

          {!asTable && (
            <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                {t("adminFinTableTitle")}
              </Typography>
              <PeriodTable periods={[...periods].reverse()} sum={sum} locale={locale} />
            </Paper>
          )}

          <SettingsCard settings={data?.adminFinanceSettings} canEdit={user.role === "SYSTEM_ADMIN"} />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t("adminFinFootnote")}
          </Typography>
        </>
      )}
    </Box>
  );
}

function Kpi({
  label,
  value,
  caption,
  tone,
  strong,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "success" | "danger";
  strong?: boolean;
}) {
  return (
    <Grid size={{ xs: 6, md: 4, lg: 2 }}>
      <Paper sx={{ p: 2, height: "100%", border: strong ? 2 : 0, borderColor: tone === "danger" ? "error.main" : "success.main" }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" component="p" sx={{ ...amountSx, color: tone === "danger" ? "error.main" : undefined }}>
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

function PeriodTable({ periods, sum, locale }: { periods: Period[]; sum: Record<string, number>; locale: string }) {
  const { t } = useLanguage();
  const money = (v: number) => clp(v, locale);
  const cols: { key: keyof Period; label: string }[] = [
    { key: "gross", label: t("adminFinGross") },
    { key: "vat", label: t("adminFinVat") },
    { key: "providerFees", label: t("adminFinFees") },
    { key: "aiCost", label: t("adminFinAi") },
    { key: "fixedCosts", label: t("adminFinFixed") },
    { key: "profit", label: t("adminFinProfit") },
  ];
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("month")}</TableCell>
            <TableCell align="right">{t("adminFinPayments")}</TableCell>
            {cols.map((c) => (
              <TableCell key={c.key} align="right">
                {c.label}
              </TableCell>
            ))}
            <TableCell align="right">{t("adminFinMarginCol")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {periods.map((p) => (
            <TableRow key={p.month}>
              <TableCell sx={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{monthLabel(p.month, locale)}</TableCell>
              <TableCell align="right" sx={amountSx}>
                {p.payments}
              </TableCell>
              {cols.map((c) => (
                <TableCell
                  key={c.key}
                  align="right"
                  sx={{ ...amountSx, fontWeight: c.key === "profit" ? 700 : undefined, color: c.key === "profit" && p.profit < 0 ? "error.main" : undefined }}
                >
                  {money(Number(p[c.key]))}
                </TableCell>
              ))}
              <TableCell align="right" sx={amountSx}>
                {p.gross ? pct(margin(p.profit, p.gross), locale) : "—"}
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
            <TableCell>{t("total")}</TableCell>
            <TableCell align="right" sx={amountSx}>
              {sum.payments}
            </TableCell>
            {cols.map((c) => (
              <TableCell key={c.key} align="right" sx={{ ...amountSx, color: c.key === "profit" && sum.profit < 0 ? "error.main" : undefined }}>
                {money(sum[c.key as string])}
              </TableCell>
            ))}
            <TableCell align="right" sx={amountSx}>
              {sum.gross ? pct(margin(sum.profit, sum.gross), locale) : "—"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SettingsCard({ settings, canEdit }: { settings?: Settings; canEdit: boolean }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [save, { loading }] = useMutation(UPDATE_FINANCE_SETTINGS, { refetchQueries: ["AdminFinance", "AdminOverview"] });

  useEffect(() => {
    if (settings) setForm(JSON.parse(JSON.stringify(settings)));
  }, [settings]);
  if (!form) return null;

  const set = (patch: Partial<Settings>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };
  const setCost = (i: number, patch: Partial<FixedCost>) =>
    set({ fixedCosts: form.fixedCosts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  const submit = async () => {
    setErr(null);
    try {
      await save({
        variables: {
          input: {
            providerFeePercent: num(String(form.providerFeePercent)),
            providerFeeFixed: num(String(form.providerFeeFixed)),
            vatRate: num(String(form.vatRate)),
            chargesVat: form.chargesVat,
            usdToClp: num(String(form.usdToClp)),
            fixedCosts: form.fixedCosts.map(({ name, amount, currency, since }) => ({
              name,
              amount: num(String(amount)),
              currency,
              since: since || null,
            })),
          },
        },
      });
      setSaved(true);
    } catch (e: any) {
      setErr(e?.graphQLErrors?.[0]?.message ?? t("genericError"));
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2">
        {t("adminFinSettings")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("adminFinSettingsHint")}
      </Typography>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>{t("settingsUpdated")}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label={t("adminFinFeePercent")}
            value={form.providerFeePercent}
            onChange={(e) => set({ providerFeePercent: e.target.value as any })}
            disabled={!canEdit}
            fullWidth
            slotProps={{ input: { endAdornment: <InputAdornment position="end">% + IVA</InputAdornment> }, htmlInput: { inputMode: "decimal" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label={t("adminFinFeeFixed")}
            value={form.providerFeeFixed}
            onChange={(e) => set({ providerFeeFixed: e.target.value as any })}
            disabled={!canEdit}
            fullWidth
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { inputMode: "numeric" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label={t("adminFinUsd")}
            value={form.usdToClp}
            onChange={(e) => set({ usdToClp: e.target.value as any })}
            disabled={!canEdit}
            fullWidth
            slotProps={{ input: { startAdornment: <InputAdornment position="start">US$1 =</InputAdornment> }, htmlInput: { inputMode: "numeric" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={t("adminFinVatRate")}
              value={form.vatRate}
              onChange={(e) => set({ vatRate: e.target.value as any })}
              disabled={!canEdit || !form.chargesVat}
              sx={{ width: 110 }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
            <FormControlLabel
              control={<Switch checked={form.chargesVat} onChange={(e) => set({ chargesVat: e.target.checked })} disabled={!canEdit} />}
              label={t("adminFinChargesVat")}
            />
          </Stack>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
        {t("adminFinFixedTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t("adminFinFixedHint")}
      </Typography>
      <Stack spacing={1.5}>
        {form.fixedCosts.map((c, i) => (
          <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <TextField label={t("name")} value={c.name} onChange={(e) => setCost(i, { name: e.target.value })} disabled={!canEdit} sx={{ flex: 2 }} size="small" />
            <TextField
              label={t("adminFinMonthly")}
              value={c.amount}
              onChange={(e) => setCost(i, { amount: e.target.value as any })}
              disabled={!canEdit}
              sx={{ flex: 1 }}
              size="small"
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
            <TextField select label={t("currency")} value={c.currency} onChange={(e) => setCost(i, { currency: e.target.value as any })} disabled={!canEdit} sx={{ width: 100 }} size="small">
              <MenuItem value="CLP">CLP</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
            </TextField>
            <TextField
              label={t("adminFinSince")}
              placeholder="2026-11"
              value={c.since ?? ""}
              onChange={(e) => setCost(i, { since: e.target.value })}
              disabled={!canEdit}
              sx={{ width: 130 }}
              size="small"
            />
            {canEdit && (
              <IconButton aria-label={t("delete")} onClick={() => set({ fixedCosts: form.fixedCosts.filter((_, j) => j !== i) })}>
                <DeleteOutlineRounded />
              </IconButton>
            )}
          </Stack>
        ))}
        {form.fixedCosts.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t("adminFinNoFixed")}
          </Typography>
        )}
      </Stack>

      {canEdit && (
        <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
          <Button startIcon={<AddRounded />} onClick={() => set({ fixedCosts: [...form.fixedCosts, { name: "", amount: 0, currency: "USD", since: null }] })}>
            {t("adminFinAddCost")}
          </Button>
          <Button variant="contained" onClick={submit} disabled={loading}>
            {t("save")}
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
