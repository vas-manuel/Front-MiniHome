import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import { PlanLimitAlert } from "../plans/planLimit";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { formatMonthYear } from "../../utils/format";
import { GET_ACCOUNTS } from "../bills/queries";
import type { ReceiptAnalysis } from "./queries";
import type { Conflict } from "./useReceiptUpload";
import { ReceiptPreview } from "./ReceiptPreview";
import {
  formatThousands,
  initialForm,
  NEW_ACCOUNT,
  parseThousands,
  ReceiptFormState,
  resultingMonthTotal,
  validateForm,
} from "./receiptForm";

interface Props {
  analysis: ReceiptAnalysis;
  saving: boolean;
  conflict: Conflict | null;
  error: string | null;
  onConfirm: (form: ReceiptFormState) => void;
  onReplace: () => void;
  onDismissConflict: () => void;
  onCancel: () => void;
}

type Account = { id: string; name: string; group?: { name: string } | null };

/* Modal de confirmación (FR-005 a FR-013): todo editable antes de guardar */
export function ReceiptConfirmDialog({ analysis, saving, conflict, error, onConfirm, onReplace, onDismissConflict, onCancel }: Props) {
  const { t, money, locale } = useLanguage();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { data } = useQuery<{ billAccounts: Account[] }>(GET_ACCOUNTS, { variables: { type: "FIXED" } });

  const init = useMemo(() => initialForm(analysis), [analysis]);
  const [form, setForm] = useState<ReceiptFormState>(init.form);
  const [touched, setTouched] = useState(false);
  useEffect(() => setForm(init.form), [init]);

  const v = validateForm(form);
  const set = <K extends keyof ReceiptFormState>(k: K, value: ReceiptFormState[K]) => setForm((f) => ({ ...f, [k]: value }));
  const review = (k: keyof ReceiptFormState) => init.flags.review[k] && !(touched && v.errors[k]);
  const errorText = (k: keyof ReceiptFormState) => {
    const e = touched ? v.errors[k] : undefined;
    if (e === "yearRange") return t("receiptYearOutOfRange", { from: v.yearRange.from, to: v.yearRange.to });
    if (e) return t("receiptRequired");
    return review(k) ? t("receiptCheckField") : undefined;
  };

  const suggested = new Map(analysis.accountSuggestions.map((s) => [s.account.id, s]));
  const accounts = data?.billAccounts ?? [];
  const groups = useMemo(() => {
    const g: Record<string, Account[]> = {};
    accounts
      .filter((a) => !suggested.has(a.id))
      .forEach((a) => (g[a.group?.name || t("noGroup")] ||= []).push(a));
    return Object.entries(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, analysis, t]);

  const submit = () => {
    setTouched(true);
    if (v.valid) onConfirm(form);
  };

  const accountName =
    form.accountId === NEW_ACCOUNT ? form.newAccountName : accounts.find((a) => a.id === form.accountId)?.name ?? "";
  const months = Array.from({ length: 12 }, (_, i) => {
    const name = new Date(2024, i, 1).toLocaleDateString(locale, { month: "long" });
    return { value: i + 1, label: name.charAt(0).toUpperCase() + name.slice(1) };
  });
  const amountChoices = [
    analysis.totalWithoutPreviousBalance ? { value: analysis.totalWithoutPreviousBalance, key: "receiptUseMonthOnly" } : null,
    analysis.total && analysis.totalWithoutPreviousBalance ? { value: analysis.total, key: "receiptUseTotal" } : null,
  ].filter(Boolean) as { value: number; key: string }[];

  return (
    <Dialog open onClose={saving ? undefined : onCancel} fullScreen={fullScreen} maxWidth="md" fullWidth aria-labelledby="receipt-title">
      <DialogTitle id="receipt-title">
        {t("receiptReviewTitle")}
        <Typography variant="body2" color="text.secondary">
          {t("receiptReviewSubtitle")}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <ReceiptPreview url={analysis.previewUrl} height={fullScreen ? 280 : 520} />

          <Stack spacing={2}>
            {analysis.duplicate?.sameFile && <Alert severity="info">{t("receiptSameFile")}</Alert>}
            {error === "planLimit" && <PlanLimitAlert message={t("planLimitAccounts")} />}
            {error && error !== "planLimit" && <Alert severity="error">{t("genericError")}</Alert>}

            <TextField
              select
              label={t("receiptAccount")}
              value={form.accountId}
              onChange={(e) => set("accountId", e.target.value)}
              error={touched && Boolean(v.errors.accountId)}
              helperText={errorText("accountId")}
              color={review("accountId") ? "warning" : undefined}
              focused={review("accountId") || undefined}
            >
              {analysis.accountSuggestions.map((s) => (
                <MenuItem key={s.account.id} value={s.account.id}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                    <span>{s.account.name}</span>
                    <Box sx={{ flex: 1 }} />
                    {s.reason === "LEARNED_CUSTOMER_NUMBER" ? (
                      <Chip size="small" color="success" icon={<VerifiedRounded />} label={t("receiptRecognized")} />
                    ) : (
                      <Chip size="small" variant="outlined" label={t("receiptSuggested")} />
                    )}
                  </Stack>
                </MenuItem>
              ))}
              {groups.flatMap(([g, items]) => [
                <ListSubheader key={`g-${g}`}>{g}</ListSubheader>,
                ...items.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                )),
              ])}
              <MenuItem value={NEW_ACCOUNT}>+ {t("receiptNewAccount")}</MenuItem>
            </TextField>

            {form.accountId === NEW_ACCOUNT && (
              <TextField
                autoFocus
                label={t("receiptNewAccountName")}
                value={form.newAccountName}
                onChange={(e) => set("newAccountName", e.target.value)}
                error={touched && Boolean(v.errors.newAccountName)}
                helperText={touched && v.errors.newAccountName ? t("receiptRequired") : undefined}
              />
            )}

            <Stack direction="row" spacing={2}>
              <TextField
                select
                fullWidth
                label={t("month")}
                value={form.month}
                onChange={(e) => set("month", Number(e.target.value))}
                error={touched && Boolean(v.errors.month)}
                helperText={errorText("month")}
                color={review("month") ? "warning" : undefined}
                focused={review("month") || undefined}
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("year")}
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value ? Number(e.target.value) : "")}
                error={touched && Boolean(v.errors.year)}
                helperText={errorText("year")}
                sx={{ width: 140 }}
              />
            </Stack>
            {v.farMonth && <Alert severity="warning">{t("receiptFarMonth")}</Alert>}

            <TextField
              label={t("amount")}
              value={form.amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\./g, "");
                if (/^[0-9]*$/.test(raw)) set("amount", raw ? formatThousands(Number(raw)) : "");
              }}
              error={touched && Boolean(v.errors.amount)}
              helperText={errorText("amount")}
              color={review("amount") ? "warning" : undefined}
              focused={review("amount") || undefined}
              inputProps={{ inputMode: "numeric", style: { fontVariantNumeric: "tabular-nums" } }}
            />

            {Number(analysis.previousBalance) > 0 && (
              <Alert severity={init.flags.carriedAdjusted ? "warning" : "info"}>
                <Typography variant="body2">
                  {init.flags.carriedAdjusted
                    ? t("receiptCarriedHint", { value: money(Number(analysis.duplicate?.existingAmount?.carried_amount)) })
                    : t("receiptPreviousBalance", { value: money(Number(analysis.previousBalance)) })}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  {amountChoices.map((c) => (
                    <Chip
                      key={c.key}
                      label={t(c.key, { value: money(c.value) })}
                      onClick={() => set("amount", formatThousands(c.value))}
                      color={parseThousands(form.amount) === c.value ? "primary" : "default"}
                      variant={parseThousands(form.amount) === c.value ? "filled" : "outlined"}
                    />
                  ))}
                </Stack>
                {init.flags.carriedAdjusted && (
                  <Typography variant="caption" sx={{ display: "block", mt: 1, ...amountSx }}>
                    {t("receiptResultingTotal", { value: money(resultingMonthTotal(form, analysis)) })}
                  </Typography>
                )}
              </Alert>
            )}

            {analysis.totalCandidates.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("receiptOtherTotals")}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                  {analysis.totalCandidates.map((c) => (
                    <Chip
                      key={`${c.label}-${c.value}`}
                      size="small"
                      variant="outlined"
                      label={`${c.label}: ${money(c.value)}`}
                      onClick={() => set("amount", formatThousands(c.value))}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select fullWidth label={t("amountStatus")} value={form.status} onChange={(e) => set("status", e.target.value as ReceiptFormState["status"])}>
                <MenuItem value="NOT_CONFIRMED">{t("statusToConfirmOption")}</MenuItem>
                <MenuItem value="CONFIRMED">{t("statusConfirmedOption")}</MenuItem>
                <MenuItem value="PAID">{t("statusPaidOption")}</MenuItem>
              </TextField>
              <TextField
                fullWidth
                type="date"
                label={t("receiptDueDate")}
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {conflict && (
              <Alert
                severity="warning"
                role="alert"
                action={
                  <Stack direction="row" spacing={1}>
                    <Button color="inherit" size="small" onClick={onDismissConflict}>
                      {t("cancel")}
                    </Button>
                    <Button color="inherit" size="small" variant="outlined" onClick={onReplace} disabled={saving}>
                      {t("receiptReplace")}
                    </Button>
                  </Stack>
                }
              >
                {t("receiptExists", {
                  value: conflict.existingAmount !== null ? money(conflict.existingAmount) : "—",
                  account: accountName,
                  period: form.month && form.year ? formatMonthYear(Number(form.month), Number(form.year), locale) : "",
                })}
              </Alert>
            )}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving || Boolean(conflict)}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
