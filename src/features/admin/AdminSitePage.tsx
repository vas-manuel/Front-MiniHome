/*
 * Estadísticas del sitio monihome.cl: visitas, tiempo, origen, ubicación, dispositivos, clics y registros.
 * Datos propios (tabla site_events), sin herramientas de terceros.
 */
import { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import FiberManualRecordRounded from "@mui/icons-material/FiberManualRecordRounded";
import { PageHeader } from "../../components/common";
import { LineChart } from "../../components/LineChart";
import { groupSeriesPalette } from "../../brand/tokens";
import { amountSx } from "../../brand/theme";
import { useLanguage } from "../../i18n";
import { pct } from "./adminFormat";

const BREAKDOWN = `key visitors signups`;
const SITE_STATS = gql`
  query AdminSiteStats($days: Int!) {
    adminSiteStats(days: $days) {
      days
      visitors
      newVisitors
      sessions
      pageviews
      pagesPerSession
      avgSessionSeconds
      bounceRate
      avgScroll
      signups
      conversionRate
      liveVisitors
      daily { day visitors pageviews signups }
      pages { path views visitors avgSeconds avgScroll }
      channels { ${BREAKDOWN} }
      referrers { ${BREAKDOWN} }
      campaigns { ${BREAKDOWN} }
      countries { ${BREAKDOWN} }
      cities { ${BREAKDOWN} }
      devices { ${BREAKDOWN} }
      browsers { ${BREAKDOWN} }
      systems { ${BREAKDOWN} }
      clicks { name target count visitors }
      funnel { visitors interested clicked signed }
    }
  }
`;

type Row = { key: string; visitors: number; signups: number };

const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

export default function AdminSitePage() {
  const { t, locale } = useLanguage();
  const theme = useTheme();
  const palette = groupSeriesPalette(theme.palette.mode);
  const [days, setDays] = useState(30);
  const [asTable, setAsTable] = useState(false);
  const { data, loading, error } = useQuery(SITE_STATS, { variables: { days }, fetchPolicy: "cache-and-network", pollInterval: 60_000 });
  const s = data?.adminSiteStats;

  const country = (code: string) => {
    if (!code || code === "??") return t("adminSiteUnknown");
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  const channel = (k: string) => t(`adminSiteChannel_${k}`) || k;
  const clickLabel = (name: string, target: string | null) => {
    const base = t(`adminSiteClick_${name}`);
    const label = base === `adminSiteClick_${name}` ? name : base;
    return target ? `${label} · ${target}` : label;
  };
  const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <Box>
      <PageHeader
        title={t("adminSiteTitle")}
        subtitle={t("adminSiteSubtitle")}
        actions={
          <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, v) => v && setDays(v)} aria-label={t("adminFinRange")}>
            <ToggleButton value={7}>{t("adminSiteDaysN", { n: 7 })}</ToggleButton>
            <ToggleButton value={30}>{t("adminSiteDaysN", { n: 30 })}</ToggleButton>
            <ToggleButton value={90}>{t("adminSiteDaysN", { n: 90 })}</ToggleButton>
            <ToggleButton value={365}>{t("adminSiteDaysN", { n: 365 })}</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{t("genericError")}</Alert>}

      {loading && !s ? (
        <Skeleton variant="rounded" height={420} />
      ) : s ? (
        <>
          {s.visitors === 0 && <Alert severity="info" sx={{ mb: 2 }}>{t("adminSiteEmpty")}</Alert>}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Kpi label={t("adminSiteVisitors")} value={s.visitors} caption={t("adminSiteNew", { n: s.newVisitors })} />
            <Kpi label={t("adminSiteSessions")} value={s.sessions} caption={t("adminSitePagesPer", { n: s.pagesPerSession.toFixed(1) })} />
            <Kpi label={t("adminSiteTime")} value={duration(s.avgSessionSeconds)} caption={t("adminSiteScroll", { n: s.avgScroll })} />
            <Kpi label={t("adminSiteBounce")} value={pct(s.bounceRate, locale)} caption={t("adminSiteBounceHint")} />
            <Kpi label={t("adminSiteSignups")} value={s.signups} caption={t("adminSiteConversion", { pct: pct(s.conversionRate, locale) })} strong />
            <Kpi
              label={t("adminSiteLive")}
              value={s.liveVisitors}
              caption={t("adminSiteLiveHint")}
              icon={<FiberManualRecordRounded fontSize="small" color={s.liveVisitors ? "success" : "disabled"} />}
            />
          </Grid>

          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" component="h2">
                {t("adminSiteDaily")}
              </Typography>
              <Button size="small" onClick={() => setAsTable((v) => !v)}>
                {asTable ? t("viewChart") : t("viewTable")}
              </Button>
            </Stack>
            {asTable ? (
              <SimpleTable
                head={[t("adminSiteDay"), t("adminSiteVisitors"), t("adminSitePageviews"), t("adminSiteSignups")]}
                rows={[...s.daily].reverse().map((d: any) => [dayLabel(d.day), d.visitors, d.pageviews, d.signups])}
              />
            ) : s.daily.length ? (
              <LineChart
                labels={s.daily.map((d: any) => dayLabel(d.day))}
                series={[
                  { key: "v", label: t("adminSiteVisitors"), color: palette[0], values: s.daily.map((d: any) => d.visitors) },
                  { key: "p", label: t("adminSitePageviews"), color: palette[1], values: s.daily.map((d: any) => d.pageviews) },
                  { key: "r", label: t("adminSiteSignups"), color: palette[2], values: s.daily.map((d: any) => d.signups) },
                ]}
                formatValue={(v) => String(Math.round(v))}
                locale={locale}
                ariaLabel={t("adminSiteDaily")}
              />
            ) : (
              <Typography color="text.secondary">{t("adminSiteNoData")}</Typography>
            )}
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
                <Typography variant="h6" component="h2">
                  {t("adminSiteFunnel")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t("adminSiteFunnelHint")}
                </Typography>
                <Funnel
                  color={palette[0]}
                  steps={[
                    { label: t("adminSiteFunnelVisit"), value: s.funnel.visitors },
                    { label: t("adminSiteFunnelInterest"), value: s.funnel.interested },
                    { label: t("adminSiteFunnelClick"), value: s.funnel.clicked },
                    { label: t("adminSiteFunnelSignup"), value: s.funnel.signed },
                  ]}
                  locale={locale}
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Breakdown title={t("adminSiteChannels")} rows={s.channels} label={channel} locale={locale} withSignups />
            </Grid>
          </Grid>

          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t("adminSitePages")}
            </Typography>
            <SimpleTable
              head={[t("adminSitePage"), t("adminSiteViews"), t("adminSiteVisitors"), t("adminSiteAvgTime"), t("adminSiteScrollCol")]}
              rows={s.pages.map((p: any) => [p.path, p.views, p.visitors, duration(p.avgSeconds), `${p.avgScroll}%`])}
            />
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Breakdown title={t("adminSiteCountries")} rows={s.countries} label={country} locale={locale} withSignups />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Breakdown title={t("adminSiteCities")} rows={s.cities} label={(k) => k} locale={locale} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Breakdown title={t("adminSiteReferrers")} rows={s.referrers} label={(k) => k} locale={locale} withSignups />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Breakdown title={t("adminSiteCampaigns")} rows={s.campaigns} label={(k) => k} locale={locale} withSignups empty={t("adminSiteCampaignsEmpty")} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Breakdown title={t("adminSiteDevices")} rows={s.devices} label={(k) => t(`adminSiteDevice_${k}`)} locale={locale} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Breakdown title={t("adminSiteBrowsers")} rows={s.browsers} label={(k) => k} locale={locale} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Breakdown title={t("adminSiteSystems")} rows={s.systems} label={(k) => k} locale={locale} />
            </Grid>
          </Grid>

          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {t("adminSiteClicks")}
            </Typography>
            <SimpleTable
              head={[t("adminSiteAction"), t("adminSiteTimes"), t("adminSiteVisitors")]}
              rows={s.clicks.map((c: any) => [clickLabel(c.name, c.target), c.count, c.visitors])}
            />
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t("adminSiteFootnote")}
          </Typography>
        </>
      ) : null}
    </Box>
  );
}

function Kpi({ label, value, caption, strong, icon }: { label: string; value: string | number; caption?: string; strong?: boolean; icon?: React.ReactNode }) {
  return (
    <Grid size={{ xs: 6, md: 4, lg: 2 }}>
      <Paper sx={{ p: 2, height: "100%", border: strong ? 2 : 0, borderColor: "success.main" }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {icon}
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
        <Typography variant="h5" component="p" sx={amountSx}>
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

/* Barras horizontales de un solo color (magnitud); el texto siempre en tinta, nunca en el color de la barra */
function Breakdown({
  title,
  rows,
  label,
  locale,
  withSignups,
  empty,
}: {
  title: string;
  rows: Row[];
  label: (k: string) => string;
  locale: string;
  withSignups?: boolean;
  empty?: string;
}) {
  const { t } = useLanguage();
  const theme = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {empty ?? t("adminSiteNoData")}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {rows.slice(0, 10).map((r) => (
            <Box key={r.key}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" noWrap title={label(r.key)}>
                  {label(r.key)}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: "none" }}>
                  {withSignups && r.signups > 0 && <Chip size="small" color="success" variant="outlined" label={t("adminSiteSignupsN", { n: r.signups })} />}
                  <Typography variant="body2" fontWeight={600} sx={amountSx}>
                    {r.visitors}
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ height: 6, mt: 0.5, borderRadius: "3px", bgcolor: "action.hover", overflow: "hidden" }}>
                <Box sx={{ width: `${(r.visitors / max) * 100}%`, height: "100%", borderRadius: "3px", bgcolor: theme.palette.primary.main }} />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
      {rows.length > 0 && withSignups && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          {t("adminSiteBreakdownHint")}
        </Typography>
      )}
    </Paper>
  );
}

function Funnel({ steps, color, locale }: { steps: { label: string; value: number }[]; color: string; locale: string }) {
  const top = Math.max(1, steps[0].value);
  return (
    <Stack spacing={1.5}>
      {steps.map((s, i) => (
        <Box key={s.label}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">{s.label}</Typography>
            <Typography variant="body2" fontWeight={600} sx={amountSx}>
              {s.value}
              {i > 0 && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {pct(s.value / top, locale)}
                </Typography>
              )}
            </Typography>
          </Stack>
          <Box sx={{ height: 14, mt: 0.5, borderRadius: "4px", bgcolor: "action.hover", overflow: "hidden" }}>
            <Box sx={{ width: `${(s.value / top) * 100}%`, height: "100%", borderRadius: "4px", bgcolor: color, opacity: 1 - i * 0.15 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const { t } = useLanguage();
  if (!rows.length) return <Typography color="text.secondary">{t("adminSiteNoData")}</Typography>;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {head.map((h, i) => (
              <TableCell key={h} align={i ? "right" : "left"}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((c, j) => (
                <TableCell key={j} align={j ? "right" : "left"} sx={j ? amountSx : { wordBreak: "break-all" }}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
