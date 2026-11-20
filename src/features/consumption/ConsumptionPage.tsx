/*
 * Consumo (versión de prueba): gastos variables del mes con productos y categorías.
 * Carga de boleta (IA si el servidor tiene clave; si no, lectura básica) o gasto rápido manual.
 */
import { useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import DocumentScannerRounded from "@mui/icons-material/DocumentScannerRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import { useLanguage } from "../../i18n";
import { useSession } from "../../app/session";
import { amountSx } from "../../brand/theme";
import { EmptyState, MonthSwitcher, PageHeader } from "../../components/common";
import { formatShortDate } from "../../utils/format";
import { ACCEPT_ATTR } from "../receipts/api";
import { ReceiptViewButton } from "../receipts/ReceiptViewButton";
import { PurchaseDialog } from "./PurchaseDialog";
import { usePurchaseUpload } from "./usePurchaseUpload";
import { budgetLevel, formatNumber } from "./purchaseForm";
import { CategoriesDialog } from "./CategoriesDialog";
import { ProductHistoryDialog } from "./ProductHistoryDialog";
import { ShoppingListPanel } from "./ShoppingListPanel";
import { ConsumptionSummary, DELETE_PURCHASE, ExpenseCategory, GET_CATEGORIES, GET_CONSUMPTION, Purchase } from "./queries";

const UNREADABLE_KEYS: Record<string, string> = {
  NOT_A_RECEIPT: "purchaseUnreadableNotReceipt",
  LOW_QUALITY: "unreadableLOW_QUALITY",
  NO_TEXT: "unreadableNO_TEXT",
  PROTECTED_PDF: "unreadablePROTECTED_PDF",
  UNSUPPORTED_FILE: "unreadableUNSUPPORTED_FILE",
  FILE_TOO_LARGE: "unreadableFILE_TOO_LARGE",
};

const parseIsoDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function ConsumptionPage() {
  const { t, money, locale } = useLanguage();
  const { can } = useSession();
  const canEdit = can("bills");
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState<"purchases" | "products" | "list">("purchases");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [historyOf, setHistoryOf] = useState<{ productName: string; unit: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const { data: catData } = useQuery<{ expenseCategories: ExpenseCategory[]; purchaseReaderInfo: { engine: string; model: string | null } }>(
    GET_CATEGORIES
  );
  const { data, loading, refetch } = useQuery<{ consumptionSummary: ConsumptionSummary; purchases: Purchase[] }>(GET_CONSUMPTION, {
    variables: { year, month },
    fetchPolicy: "cache-and-network",
  });
  const [deletePurchase] = useMutation(DELETE_PURCHASE);
  const { flow, start, startManual, startEdit, confirm, cancel, reset } = usePurchaseUpload(() => setToast(t("purchaseSaved")));

  const categories = catData?.expenseCategories ?? [];
  const reader = catData?.purchaseReaderInfo;
  const summary = data?.consumptionSummary;
  const purchases = data?.purchases ?? [];

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) start(file);
    if (input.current) input.current.value = "";
  };

  return (
    <Box>
      <PageHeader
        title={t("consumptionTitle")}
        subtitle={t("consumptionSubtitle")}
        actions={
          canEdit && (
            <>
              <Button startIcon={<CategoryRounded />} onClick={() => setCategoriesOpen(true)} disabled={!categories.length}>
                {t("categoriesButton")}
              </Button>
              <Button variant="outlined" startIcon={<AddRounded />} onClick={startManual} disabled={!categories.length}>
                {t("purchaseQuick")}
              </Button>
              <Button variant="contained" startIcon={<DocumentScannerRounded />} onClick={() => input.current?.click()} disabled={!categories.length}>
                {t("purchaseUpload")}
              </Button>
              <input ref={input} type="file" hidden accept={ACCEPT_ATTR} onChange={(e) => onFiles(e.target.files)} />
            </>
          )
        }
      />

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 2 }}>
        <MonthSwitcher
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          maxMonthsAhead={0}
        />
        {reader && (
          <Tooltip title={reader.engine === "AI" ? t("purchaseReaderAIHint") : t("purchaseReaderOCRHint")}>
            <Chip
              size="small"
              variant="outlined"
              icon={reader.engine === "AI" ? <AutoAwesomeRounded /> : undefined}
              label={reader.engine === "AI" ? t("purchaseReaderAI", { model: reader.model ?? "" }) : t("purchaseReaderOCR")}
            />
          </Tooltip>
        )}
      </Stack>

      {loading && !data && <LinearProgress sx={{ mb: 2 }} />}

      {summary && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
            <Typography color="text.secondary">{t("consumptionMonthTotal")}</Typography>
            <Typography variant="h5" sx={amountSx}>
              {money(summary.total)}
            </Typography>
          </Stack>
          {summary.categories.length === 0 ? (
            <Typography color="text.secondary">{t("consumptionEmptyMonth")}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {summary.categories.map((c) => {
                const budget = c.category.monthlyBudget;
                const level = budgetLevel(c.total, budget);
                // Con presupuesto la barra mide el uso del presupuesto; sin él, la parte del total del mes
                const pct = budget ? Math.min((c.total / budget) * 100, 100) : summary.total > 0 ? (c.total / summary.total) * 100 : 0;
                const color = level === "over" ? "error" : level === "warning" ? "warning" : "primary";
                return (
                  <Box key={c.category.id}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={500}>{c.category.name}</Typography>
                      <Typography sx={amountSx}>
                        {money(c.total)}{" "}
                        <Typography component="span" color={level === "over" ? "error.main" : "text.secondary"} variant="body2">
                          {budget
                            ? `${t("budgetOf", { budget: money(budget) })}`
                            : `· ${Math.round(summary.total > 0 ? (c.total / summary.total) * 100 : 0)}%`}
                        </Typography>
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color={color}
                      sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                      aria-label={c.category.name}
                    />
                    {level === "over" && (
                      <Typography variant="caption" color="error.main">
                        {t("budgetOver", { value: money(c.total - (budget ?? 0)) })}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="purchases" label={t("consumptionPurchasesTab", { count: purchases.length })} />
        <Tab value="products" label={t("consumptionProductsTab")} />
        <Tab value="list" label={t("shoppingListTab")} />
      </Tabs>

      {tab === "purchases" &&
        (purchases.length === 0 ? (
          <Paper>
            <EmptyState title={t("consumptionNoPurchases")} description={t("consumptionNoPurchasesHint")} />
          </Paper>
        ) : (
          <Stack spacing={1}>
            {purchases.map((p) => (
              <Accordion key={p.id} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", pr: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 56 }}>
                      {formatShortDate(parseIsoDate(p.purchase_date), locale)}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} noWrap>
                        {p.merchant_name || t("purchaseNoMerchant")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t("purchaseItemsCount", { count: p.items.length })}
                        {p.source !== "MANUAL" && ` · ${p.source === "RECEIPT_AI" ? t("purchaseEngineAI") : t("purchaseEngineOCR")}`}
                      </Typography>
                    </Box>
                    <Typography fontWeight={600} sx={amountSx}>
                      {money(p.total)}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("purchaseProduct")}</TableCell>
                        <TableCell>{t("purchaseCategory")}</TableCell>
                        <TableCell align="right">{t("purchaseQuantity")}</TableCell>
                        <TableCell align="right">{t("amount")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {p.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>
                            {i.product_name}
                            {i.description && i.description !== i.product_name && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {i.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{i.category.name}</TableCell>
                          <TableCell align="right">
                            {formatNumber(i.quantity)} {i.unit}
                          </TableCell>
                          <TableCell align="right" sx={amountSx}>
                            {money(i.line_total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
                    {canEdit && (
                      <Tooltip title={t("purchaseEdit")}>
                        <IconButton aria-label={t("purchaseEdit")} onClick={() => startEdit(p)}>
                          <EditRounded />
                        </IconButton>
                      </Tooltip>
                    )}
                    {p.receiptUrl && <ReceiptViewButton receipt={{ url: p.receiptUrl }} title={p.merchant_name || t("purchaseNoMerchant")} />}
                    {canEdit && (
                      <Tooltip title={t("delete")}>
                        <IconButton aria-label={t("delete")} onClick={() => setToDelete(p)}>
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        ))}

      {tab === "products" &&
        (!summary?.products.length ? (
          <Paper>
            <EmptyState title={t("consumptionNoProducts")} />
          </Paper>
        ) : (
          <Paper sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("purchaseProduct")}</TableCell>
                  <TableCell>{t("purchaseCategory")}</TableCell>
                  <TableCell align="right">{t("consumptionBought")}</TableCell>
                  <TableCell align="right">{t("consumptionSpent")}</TableCell>
                  <TableCell align="right">{t("consumptionAvgPrice")}</TableCell>
                  <TableCell align="right">{t("consumptionTimes")}</TableCell>
                  <TableCell align="right">{t("consumptionLast")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.products.map((p) => (
                  <TableRow
                    key={`${p.productName}|${p.unit}`}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => setHistoryOf({ productName: p.productName, unit: p.unit })}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setHistoryOf({ productName: p.productName, unit: p.unit })}
                  >
                    <TableCell>{p.productName}</TableCell>
                    <TableCell>{p.category.name}</TableCell>
                    <TableCell align="right">
                      {formatNumber(p.quantity)} {p.unit}
                    </TableCell>
                    <TableCell align="right" sx={amountSx}>
                      {money(p.spent)}
                    </TableCell>
                    <TableCell align="right" sx={amountSx}>
                      {p.averageUnitPrice !== null ? `${money(p.averageUnitPrice)} / ${p.unit}` : "—"}
                    </TableCell>
                    <TableCell align="right">{p.purchases}</TableCell>
                    <TableCell align="right">{formatShortDate(parseIsoDate(p.lastDate), locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))}

      {tab === "list" && <ShoppingListPanel onOpenProduct={setHistoryOf} onCopied={() => setToast(t("shoppingListCopied"))} />}

      {tab === "products" && Boolean(summary?.products.length) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {t("consumptionProductsHint")}
        </Typography>
      )}

      <CategoriesDialog open={categoriesOpen} categories={categories} onClose={() => setCategoriesOpen(false)} />
      <ProductHistoryDialog product={historyOf} year={year} month={month} onClose={() => setHistoryOf(null)} />

      <Backdrop open={flow.kind === "busy"} sx={{ zIndex: (th) => th.zIndex.modal + 1, color: "#fff" }}>
        <Stack alignItems="center" spacing={2} role="status" aria-live="polite">
          <CircularProgress color="inherit" />
          <Typography>{t("purchaseReading")}</Typography>
        </Stack>
      </Backdrop>

      {flow.kind === "review" && (
        <PurchaseDialog
          key={flow.analysis?.uploadId ?? flow.editing?.id ?? "manual"}
          categories={categories}
          analysis={flow.analysis}
          initial={flow.editing?.form}
          previewUrl={flow.editing?.previewUrl}
          saving={flow.saving}
          error={flow.error}
          onConfirm={confirm}
          onCancel={cancel}
        />
      )}

      <Dialog open={flow.kind === "unreadable"} onClose={reset} maxWidth="xs" fullWidth>
        <DialogTitle>{t("unreadableTitle")}</DialogTitle>
        <DialogContent>
          <Typography role="alert" sx={{ mb: 1 }}>
            {flow.kind === "unreadable" ? t(UNREADABLE_KEYS[flow.reason] ?? "purchaseUnreadableNoItems") : ""}
          </Typography>
          <Typography color="text.secondary">{t("unreadableTips")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              reset();
              startManual();
            }}
          >
            {t("purchaseEnterManually")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              reset();
              input.current?.click();
            }}
          >
            {t("tryAnotherFile")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("purchaseDeleteTitle")}</DialogTitle>
        <DialogContent>
          <Typography>
            {toDelete && t("purchaseDeleteText", { merchant: toDelete.merchant_name || t("purchaseNoMerchant"), value: money(toDelete.total) })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setToDelete(null)}>{t("cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              const target = toDelete;
              setToDelete(null);
              if (!target) return;
              try {
                await deletePurchase({ variables: { id: target.id } });
                await refetch();
                setToast(t("purchaseDeleted"));
              } catch {
                setToast(t("genericError"));
              }
            }}
          >
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={flow.kind === "error"} autoHideDuration={8000} onClose={reset}>
        <Alert severity="error" onClose={reset} variant="filled">
          {t("genericError")}
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
}
