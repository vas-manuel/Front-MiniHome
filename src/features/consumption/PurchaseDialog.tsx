import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { ReceiptPreview } from "../receipts/ReceiptPreview";
import type { ExpenseCategory, PurchaseAnalysis } from "./queries";
import {
  emptyForm,
  emptyItem,
  formFromAnalysis,
  ItemForm,
  itemsTotal,
  PurchaseFormState,
  totalsByCategory,
  UNITS,
  validate,
} from "./purchaseForm";

interface Props {
  categories: ExpenseCategory[];
  /** Con análisis: confirmar una boleta. Sin análisis: gasto rápido manual. */
  analysis: PurchaseAnalysis | null;
  saving: boolean;
  error: boolean;
  onConfirm: (form: PurchaseFormState) => void;
  onCancel: () => void;
}

const PAYMENTS = ["EFECTIVO", "DEBITO", "CREDITO", "APP", "OTRO"];

export function PurchaseDialog({ categories, analysis, saving, error, onConfirm, onCancel }: Props) {
  const { t, money } = useLanguage();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const defaultCategory = categories.find((c) => c.code === "ALIMENTOS")?.id ?? categories[0]?.id ?? "";

  const [form, setForm] = useState<PurchaseFormState>(() =>
    analysis ? formFromAnalysis(analysis) : emptyForm(defaultCategory)
  );
  const [touched, setTouched] = useState(false);
  const v = validate(form);
  const total = itemsTotal(form.items);
  const order = categories.map((c) => c.id);
  const byCategory = useMemo(() => totalsByCategory(form.items, order), [form.items, order]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const setField = <K extends keyof PurchaseFormState>(k: K, value: PurchaseFormState[K]) => setForm((f) => ({ ...f, [k]: value }));
  const setItem = (key: string, patch: Partial<ItemForm>) =>
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const removeItem = (key: string) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.key !== key) }));
  const addItem = (categoryId = defaultCategory) => setForm((f) => ({ ...f, items: [...f.items, emptyItem(categoryId)] }));

  const submit = () => {
    setTouched(true);
    if (v.valid) onConfirm(form);
  };

  const receiptTotal = analysis?.total ?? null;
  const mismatch = receiptTotal !== null && Math.abs(receiptTotal - total) > 10;

  // Productos agrupados por categoría (en el orden del hogar), conservando el orden de la boleta dentro del grupo
  const groups = order
    .map((id) => ({ id, items: form.items.filter((i) => i.categoryId === id) }))
    .filter((g) => g.items.length);

  return (
    <Dialog open onClose={saving ? undefined : onCancel} fullScreen={fullScreen} maxWidth="lg" fullWidth aria-labelledby="purchase-title">
      <DialogTitle id="purchase-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <span>{analysis ? t("purchaseReviewTitle") : t("purchaseQuickTitle")}</span>
          {analysis && (
            <Chip
              size="small"
              variant="outlined"
              icon={analysis.engine === "AI" ? <AutoAwesomeRounded /> : undefined}
              label={analysis.engine === "AI" ? t("purchaseEngineAI") : t("purchaseEngineOCR")}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {analysis ? t("purchaseReviewSubtitle") : t("purchaseQuickSubtitle")}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: analysis ? "minmax(260px, 1fr) 2fr" : "1fr" }, gap: 3 }}>
          {analysis && (
            <Box sx={{ position: { md: "sticky" }, top: 0, alignSelf: "start" }}>
              <ReceiptPreview url={analysis.previewUrl} height={fullScreen ? 260 : 600} />
            </Box>
          )}

          <Stack spacing={2}>
            {analysis?.sameFile && <Alert severity="info">{t("purchaseSameFile")}</Alert>}
            {analysis?.warnings.map((w) => (
              <Alert key={w} severity="warning">
                {w}
              </Alert>
            ))}
            {error && <Alert severity="error">{t("genericError")}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label={t("purchaseMerchant")}
                value={form.merchantName}
                onChange={(e) => setField("merchantName", e.target.value)}
              />
              <TextField
                type="date"
                label={t("purchaseDate")}
                value={form.purchaseDate}
                onChange={(e) => setField("purchaseDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={touched && !v.dateOk}
                sx={{ minWidth: 170 }}
              />
              <TextField
                select
                label={t("purchasePayment")}
                value={form.paymentMethod}
                onChange={(e) => setField("paymentMethod", e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">—</MenuItem>
                {PAYMENTS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {t(`payment${p}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {groups.map((g) => (
              <Box key={g.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography fontWeight={600}>{categoryName(g.id)}</Typography>
                  <Typography sx={amountSx} fontWeight={600}>
                    {money(byCategory.find((c) => c.categoryId === g.id)?.total ?? 0)}
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {g.items.map((item) => {
                    const idx = form.items.findIndex((i) => i.key === item.key);
                    const e = touched ? v.itemErrors[idx] ?? {} : {};
                    return (
                      <Box
                        key={item.key}
                        sx={{
                          display: "grid",
                          gap: 1,
                          alignItems: "start",
                          gridTemplateColumns: { xs: "1fr 1fr", sm: "2.2fr 0.8fr 0.8fr 1fr 1.4fr auto" },
                        }}
                      >
                        <TextField
                          size="small"
                          label={t("purchaseProduct")}
                          value={item.productName}
                          onChange={(ev) => setItem(item.key, { productName: ev.target.value })}
                          error={Boolean(e.productName)}
                          helperText={item.description && item.description !== item.productName ? item.description : undefined}
                          sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}
                          InputProps={{
                            endAdornment: item.learned ? (
                              <Tooltip title={t("purchaseLearned")}>
                                <AutoAwesomeRounded fontSize="small" color="success" />
                              </Tooltip>
                            ) : undefined,
                          }}
                        />
                        <TextField
                          size="small"
                          label={t("purchaseQuantity")}
                          value={item.quantity}
                          onChange={(ev) => setItem(item.key, { quantity: ev.target.value })}
                          error={Boolean(e.quantity)}
                          inputProps={{ inputMode: "decimal" }}
                        />
                        <TextField select size="small" label={t("purchaseUnit")} value={item.unit} onChange={(ev) => setItem(item.key, { unit: ev.target.value })}>
                          {UNITS.map((u) => (
                            <MenuItem key={u} value={u}>
                              {u}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label={t("amount")}
                          value={item.lineTotal}
                          onChange={(ev) => setItem(item.key, { lineTotal: ev.target.value })}
                          error={Boolean(e.lineTotal)}
                          helperText={item.discount > 0 ? t("purchaseDiscount", { value: money(item.discount) }) : undefined}
                          inputProps={{ inputMode: "decimal", style: { fontVariantNumeric: "tabular-nums" } }}
                        />
                        <TextField
                          select
                          size="small"
                          label={t("purchaseCategory")}
                          value={item.categoryId}
                          onChange={(ev) => setItem(item.key, { categoryId: ev.target.value })}
                        >
                          {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <IconButton aria-label={t("purchaseRemoveItem")} onClick={() => removeItem(item.key)} disabled={form.items.length === 1}>
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}

            <Box>
              <Button startIcon={<AddRounded />} onClick={() => addItem()}>
                {t("purchaseAddItem")}
              </Button>
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
              <Typography fontWeight={600}>{t("purchaseTotal")}</Typography>
              <Typography variant="h6" sx={amountSx}>
                {money(total)}
              </Typography>
            </Stack>
            {receiptTotal !== null && (
              <Alert severity={mismatch ? "warning" : "success"}>
                {mismatch
                  ? t("purchaseMismatch", { receipt: money(receiptTotal), items: money(total), diff: money(receiptTotal - total) })
                  : t("purchaseMatches", { receipt: money(receiptTotal) })}
              </Alert>
            )}
            {touched && !v.valid && <Alert severity="error">{t("purchaseFixErrors")}</Alert>}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
