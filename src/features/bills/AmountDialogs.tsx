import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { formatMonthYear } from "../../utils/format";
import { BillAmount, formatAmountInput, parseAmountInput } from "./billsLogic";

export interface AmountFormValues {
  month: number;
  amount: number;
  installments: number;
  quantity: number;
  unitPrice: number;
  purchaseDate: string | null;
  status: string;
}

interface FormProps {
  open: boolean;
  editing: BillAmount | null;
  isVariable: boolean;
  defaultMonth: number;
  onClose: () => void;
  onSubmit: (values: AmountFormValues) => Promise<void>;
}

/* Crear / editar un monto. Mantiene las validaciones originales. */
export function AmountFormDialog({ open, editing, isVariable, defaultMonth, onClose, onSubmit }: FormProps) {
  const { t, locale, money } = useLanguage();
  const [month, setMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [status, setStatus] = useState("NOT_CONFIRMED");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setInstallments(1);
    if (editing) {
      setMonth(editing.month);
      setAmount(formatAmountInput(String(editing.amount), locale) ?? String(editing.amount));
      setStatus(String(editing.status));
      setQuantity(editing.quantity || 1);
      setUnitPrice(editing.unit_price ? String(editing.unit_price) : "");
      setPurchaseDate(editing.purchase_date ? editing.purchase_date.slice(0, 10) : "");
    } else {
      setMonth(defaultMonth);
      setAmount("");
      setStatus("NOT_CONFIRMED");
      setQuantity(1);
      setUnitPrice("");
      setPurchaseDate("");
    }
  }, [open, editing, defaultMonth, locale]);

  const liveTotal = isVariable ? quantity * (Number(unitPrice) || 0) : 0;

  const submit = async () => {
    const numericAmount = parseAmountInput(amount);
    if (!isVariable && (!amount || isNaN(numericAmount))) {
      setError(t("invalidAmount"));
      return;
    }
    if (isVariable && !editing && (!quantity || !unitPrice)) {
      setError(t("fillQtyPrice"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        month,
        amount: numericAmount,
        installments,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        purchaseDate: purchaseDate || null,
        status,
      });
    } catch {
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{editing ? t("editAmount") : t("newAmount")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label={t("month")} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => {
              const name = new Date(2024, i).toLocaleDateString(locale, { month: "long" });
              return (
                <MenuItem key={i + 1} value={i + 1}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </MenuItem>
              );
            })}
          </TextField>

          {!isVariable && (
            <TextField
              label={t("amount")}
              value={amount}
              onChange={(e) => {
                const next = formatAmountInput(e.target.value, locale);
                if (next !== null) setAmount(next);
              }}
              inputProps={{ inputMode: "numeric", style: { fontVariantNumeric: "tabular-nums" } }}
              placeholder={t("amountPlaceholder")}
              error={Boolean(error) && !amount}
            />
          )}

          {isVariable && (
            <>
              <TextField
                label={t("quantity")}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) > 0 ? Number(e.target.value) : 1)}
                helperText={t("minQty")}
              />
              <TextField
                label={t("unitPrice")}
                value={unitPrice}
                onChange={(e) => /^[0-9]*$/.test(e.target.value) && setUnitPrice(e.target.value)}
                error={!unitPrice}
                helperText={!unitPrice ? t("enterUnitPrice") : ""}
                inputProps={{ inputMode: "numeric" }}
              />
              <TextField
                type="date"
                label={t("purchaseDate")}
                InputLabelProps={{ shrink: true }}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}>
                <Typography variant="subtitle2">{t("calculatedTotal")}</Typography>
                <Typography variant="h6" component="p" sx={amountSx} color={liveTotal > 0 ? "primary" : "text.secondary"}>
                  {money(liveTotal)}
                </Typography>
              </Box>
            </>
          )}

          <TextField select label={t("amountStatus")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="NOT_CONFIRMED">{t("statusToConfirmOption")}</MenuItem>
            <MenuItem value="CONFIRMED">{t("statusConfirmedOption")}</MenuItem>
            <MenuItem value="PAID">{t("statusPaidOption")}</MenuItem>
          </TextField>

          {!editing && !isVariable && (
            <TextField
              label={t("installments")}
              type="number"
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              helperText={t("installmentsHelp")}
              inputProps={{ min: 1 }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="contained" onClick={submit} disabled={busy || (isVariable && liveTotal <= 0)}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface DeleteProps {
  target: BillAmount | null;
  onClose: () => void;
  onConfirm: (mode: "ONE" | "FORWARD") => Promise<void>;
}

export function DeleteAmountDialog({ target, onClose, onConfirm }: DeleteProps) {
  const { t, locale } = useLanguage();
  const [mode, setMode] = useState<"ONE" | "FORWARD">("ONE");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) setMode("ONE");
  }, [target]);

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t("deleteTitle")}</DialogTitle>
      <DialogContent>
        {target && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>
              {t("deleteIntro")} <strong>{formatMonthYear(target.month, target.year, locale)}</strong>
            </Typography>
            <TextField select label={t("deleteWhat")} value={mode} onChange={(e) => setMode(e.target.value as "ONE" | "FORWARD")}>
              <MenuItem value="ONE">{t("deleteOne")}</MenuItem>
              <MenuItem value="FORWARD">{t("deleteForward")}</MenuItem>
            </TextField>
            <Typography variant="body2" color="error">
              {t("cannotUndo")}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm(mode);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
