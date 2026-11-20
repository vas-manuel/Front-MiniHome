/* Historial de un producto: precio por unidad y cantidad mes a mes, comercios y frecuencia */
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { chartSeries } from "../../brand/tokens";
import { LineChart } from "../../components/LineChart";
import { formatShortDate } from "../../utils/format";
import { formatNumber } from "./purchaseForm";
import { PRODUCT_HISTORY, ProductHistory } from "./queries";

const HISTORY_MONTHS = 12;

const parseIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function ProductHistoryDialog({
  product,
  year,
  month,
  onClose,
}: {
  product: { productName: string; unit: string } | null;
  year: number;
  month: number;
  onClose: () => void;
}) {
  const { t, money, locale } = useLanguage();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const colors = chartSeries(theme.palette.mode);
  const { data, loading, error } = useQuery<{ productHistory: ProductHistory }>(PRODUCT_HISTORY, {
    variables: { ...product, year, month, months: HISTORY_MONTHS },
    skip: !product,
    fetchPolicy: "network-only",
  });
  const h = data?.productHistory;
  const labels = (h?.monthly ?? []).map((m) =>
    new Date(m.year, m.month - 1, 1).toLocaleDateString(locale, { month: "short", year: "2-digit" }).replace(".", "")
  );
  const unit = product?.unit ?? "";
  const freq = h?.frequency;

  const stats = h
    ? [
        { label: t("historyBought", { months: HISTORY_MONTHS }), value: `${formatNumber(h.totalQuantity)} ${unit}` },
        { label: t("consumptionSpent"), value: money(h.totalSpent) },
        { label: t("consumptionAvgPrice"), value: h.averageUnitPrice !== null ? `${money(h.averageUnitPrice)} / ${unit}` : "—" },
        {
          label: t("historyEvery"),
          value: freq?.averageDaysBetween ? t("historyEveryDays", { days: Math.round(freq.averageDaysBetween) }) : "—",
        },
      ]
    : [];

  return (
    <Dialog open={Boolean(product)} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth aria-labelledby="history-title">
      <DialogTitle id="history-title">
        {product?.productName}
        <Typography variant="body2" color="text.secondary">
          {t("historySubtitle", { months: HISTORY_MONTHS })}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{t("genericError")}</Alert>}
        {h && (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 1.5, mb: 2 }}>
              {stats.map((s) => (
                <Card key={s.label} variant="outlined">
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography sx={{ ...amountSx, fontWeight: 600 }}>{s.value}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {freq?.nextExpected && freq.daysSinceLast !== null && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("historyNext", {
                  last: formatShortDate(parseIso(freq.lastDate!), locale),
                  days: freq.daysSinceLast,
                  next: formatShortDate(parseIso(freq.nextExpected), locale),
                })}
              </Alert>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("historyPriceChart", { unit })}
            </Typography>
            <LineChart
              ariaLabel={t("historyPriceChart", { unit })}
              labels={labels}
              locale={locale}
              formatValue={(v) => money(v)}
              height={220}
              series={[
                {
                  key: "price",
                  label: t("consumptionAvgPrice"),
                  color: colors.expense,
                  // Meses sin compra: se repite el último precio conocido para no caer a 0
                  values: h.monthly.reduce<number[]>((acc, m) => [...acc, m.averageUnitPrice ?? acc[acc.length - 1] ?? 0], []),
                },
              ]}
            />

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              {t("historyQuantityChart", { unit })}
            </Typography>
            <LineChart
              ariaLabel={t("historyQuantityChart", { unit })}
              labels={labels}
              locale={locale}
              formatValue={(v) => `${formatNumber(v)} ${unit}`}
              height={180}
              series={[{ key: "qty", label: t("purchaseQuantity"), color: colors.income, values: h.monthly.map((m) => m.quantity) }]}
            />

            {h.byMerchant.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                  {t("historyByMerchant")}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("purchaseMerchant")}</TableCell>
                      <TableCell align="right">{t("consumptionAvgPrice")}</TableCell>
                      <TableCell align="right">{t("consumptionTimes")}</TableCell>
                      <TableCell align="right">{t("consumptionLast")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {h.byMerchant.map((m, i) => (
                      <TableRow key={m.merchant ?? "—"}>
                        <TableCell>
                          {m.merchant ?? t("purchaseNoMerchant")}
                          {i === 0 && h.byMerchant.length > 1 && (
                            <Typography component="span" variant="caption" color="success.main" sx={{ ml: 1 }}>
                              {t("historyCheapest")}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={amountSx}>
                          {m.averageUnitPrice !== null ? `${money(m.averageUnitPrice)} / ${unit}` : "—"}
                        </TableCell>
                        <TableCell align="right">{m.purchases}</TableCell>
                        <TableCell align="right">{formatShortDate(parseIso(m.lastDate), locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
