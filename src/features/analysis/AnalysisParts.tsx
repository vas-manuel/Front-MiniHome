import { Fragment, ReactNode, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRounded from "@mui/icons-material/KeyboardArrowRightRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { LineChart, Series } from "../../components/LineChart";
import { AccountWithAmounts, cellState, CellState, MonthSlot } from "./analysisLogic";

export function KpiGrid({ items }: { items: { label: string; value: number }[] }) {
  const { money } = useLanguage();
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: items.length > 6 ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
      {items.map((k) => (
        <Card key={k.label}>
          <CardContent>
            <Typography variant="subtitle2">{k.label}</Typography>
            <Typography sx={{ ...amountSx, fontWeight: 700, fontSize: { xs: 18, sm: 24 }, mt: 0.5, color: k.value < 0 ? "error.main" : "text.primary" }}>
              {money(k.value)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export function ProgressCard({
  title,
  value,
  color,
  caption,
}: {
  title: string;
  value: number;
  color: "success" | "warning" | "error" | "primary";
  caption: ReactNode;
}) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <LinearProgress variant="determinate" value={Math.min(value, 100)} color={color} sx={{ height: 10, mt: 2 }} aria-label={title} />
      <Typography sx={{ mt: 1.5, ...amountSx }}>{caption}</Typography>
    </Paper>
  );
}

/* Tarjeta de gráfico con vista de tabla (accesibilidad: los datos nunca quedan solo en el color) */
export function ChartCard({
  title,
  series,
  labels,
  markerIndex,
  detail,
  onSelect,
  selectedIndex,
}: {
  title: string;
  series: Series[];
  labels: string[];
  markerIndex?: number;
  detail?: ReactNode;
  onSelect?: (i: number) => void;
  selectedIndex?: number | null;
}) {
  const { t, money, locale } = useLanguage();
  const [asTable, setAsTable] = useState(false);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 1 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Button size="small" onClick={() => setAsTable((v) => !v)}>
          {asTable ? t("viewChart") : t("viewTable")}
        </Button>
      </Box>
      {asTable ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("month")}</TableCell>
                {series.map((s) => (
                  <TableCell key={s.key} align="right">
                    {s.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {labels.map((l, i) => (
                <TableRow key={l + i}>
                  <TableCell sx={{ textTransform: "capitalize" }}>{l}</TableCell>
                  {series.map((s) => (
                    <TableCell key={s.key} align="right" sx={amountSx}>
                      {money(s.values[i] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <>
          <LineChart
            series={series}
            labels={labels}
            formatValue={money}
            locale={locale}
            markerIndex={markerIndex}
            onSelect={onSelect}
            selectedIndex={selectedIndex}
            ariaLabel={title}
            toggleLabel={(name) => t("toggleSeries", { name })}
          />
          {onSelect && (
            <Typography variant="caption" color="text.secondary">
              {t("chartHint")}
            </Typography>
          )}
          {detail}
        </>
      )}
    </Paper>
  );
}

export function DetailPanel({ title, rows, onClose }: { title: string; rows: { label: string; value: string; strong?: boolean }[]; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "background.default" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography fontWeight={600} sx={{ textTransform: "capitalize" }}>
          {title}
        </Typography>
        <Button size="small" onClick={onClose}>
          {t("close")}
        </Button>
      </Box>
      {rows.map((r) => (
        <Box key={r.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
          <Typography color="text.secondary">{r.label}</Typography>
          <Typography sx={{ ...amountSx, fontWeight: r.strong ? 700 : 500 }}>{r.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/* Tabla de 5 meses por grupo y cuenta, con estado por ícono + color (BRAND §3) */
export function MonthTable({
  window,
  grouped,
  groupTotals,
  globalTotals,
  current,
}: {
  window: (MonthSlot & { label: string })[];
  grouped: Record<string, (AccountWithAmounts & { amountMap: Record<string, number> })[]>;
  groupTotals: Record<string, Record<string, number>>;
  globalTotals: Record<string, number>;
  current: { year: number; month: number };
}) {
  const { t, money } = useLanguage();
  const theme = useTheme();
  const c = theme.palette.brandTokens;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const STYLE: Record<CellState, { bg?: string; fg?: string; Icon?: typeof CheckCircleRounded; label?: string }> = {
    paid: { bg: c.successSubtle, fg: c.success, Icon: CheckCircleRounded, label: t("statusPaid") },
    overdue: { bg: c.dangerSubtle, fg: c.danger, Icon: ErrorOutlineRounded, label: t("statusOverdue") },
    pending: { bg: c.warningSubtle, fg: c.warning, Icon: ScheduleRounded, label: t("statusPending") },
    deferredOnly: { bg: c.infoSubtle, fg: c.info, Icon: RedoRounded, label: t("statusDeferred") },
    empty: {},
  };

  return (
    <Paper sx={{ mb: 3, overflow: "hidden" }}>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", px: 2, pt: 2 }} aria-hidden>
        {(["paid", "pending", "overdue", "deferredOnly"] as CellState[]).map((k) => {
          const s = STYLE[k];
          const Icon = s.Icon!;
          return (
            <Box key={k} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: s.fg, fontSize: 12, fontWeight: 600 }}>
              <Icon sx={{ fontSize: 16 }} /> {s.label}
            </Box>
          );
        })}
      </Box>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("groupAccount")}</TableCell>
              {window.map((m) => (
                <TableCell key={m.key} align="right" sx={{ textTransform: "capitalize" }}>
                  {m.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(grouped).map(([group, accounts]) => (
              <Fragment key={group}>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setOpen((o) => ({ ...o, [group]: !o[group] }))}
                      aria-expanded={Boolean(open[group])}
                      aria-label={t("toggleGroup", { name: group })}
                    >
                      {open[group] ? <KeyboardArrowDownRounded /> : <KeyboardArrowRightRounded />}
                    </IconButton>
                    <strong>{group === "Sin Grupo" ? t("noGroup") : group}</strong>
                  </TableCell>
                  {window.map((m) => (
                    <TableCell key={m.key} align="right" sx={{ ...amountSx, fontWeight: 600 }}>
                      {money(groupTotals[group][m.key])}
                    </TableCell>
                  ))}
                </TableRow>
                {open[group] &&
                  accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell sx={{ pl: 7 }}>{acc.name}</TableCell>
                      {window.map((m) => {
                        const st = STYLE[cellState(acc, m, current)];
                        const Icon = st.Icon;
                        return (
                          <TableCell key={m.key} align="right" sx={{ ...amountSx, bgcolor: st.bg }} title={st.label}>
                            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                              {Icon && <Icon sx={{ fontSize: 14, color: st.fg }} aria-label={st.label} />}
                              {money(acc.amountMap[m.key] || 0)}
                            </Box>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
              </Fragment>
            ))}
            <TableRow>
              <TableCell>
                <strong>{t("monthTotal")}</strong>
              </TableCell>
              {window.map((m) => (
                <TableCell key={m.key} align="right" sx={{ ...amountSx, fontWeight: 700 }}>
                  {money(globalTotals[m.key])}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
