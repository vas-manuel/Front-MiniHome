import { useState } from "react";
import { Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import { useLanguage } from "../../i18n";
import { amountSx } from "../../brand/theme";
import { StatusChip } from "../../components/StatusChip";
import { formatMonthYear } from "../../utils/format";
import { BillAmount, recordState } from "./billsLogic";

const STATUS_OPTIONS = [
  { value: "NOT_CONFIRMED", key: "statusToConfirmOption" },
  { value: "CONFIRMED", key: "statusConfirmedOption" },
  { value: "PAID", key: "statusPaidOption" },
];

interface Props {
  amount: BillAmount;
  isVariable: boolean;
  dueDay?: number | null;
  carriedFromPrevious: boolean;
  canEdit: boolean;
  onSetStatus: (status: string) => void;
  onDefer: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AmountRow({ amount: a, isVariable, dueDay, carriedFromPrevious, canEdit, onSetStatus, onDefer, onEdit, onDelete }: Props) {
  const { t, money, locale } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const period = formatMonthYear(a.month, a.year, locale);
  const s = recordState(a, dueDay);
  const paid = a.status === "PAID";
  const close = () => setAnchor(null);

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", alignItems: "center", gap: 2, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
      <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
        <Typography fontWeight={600}>
          {isVariable && <ShoppingCartRounded fontSize="small" sx={{ mr: 0.5, verticalAlign: "text-bottom" }} aria-hidden />}
          {period}
        </Typography>
        {isVariable && a.product_name && (
          <Typography variant="body2" color="text.secondary">
            {a.product_name} — {a.quantity} × {money(a.unit_price || 0)}
          </Typography>
        )}
        {isVariable && a.purchase_date && (
          <Typography variant="caption" color="text.secondary">
            {new Date(a.purchase_date).toLocaleDateString(locale)}
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: "0 0 auto", textAlign: "right", minWidth: 120 }}>
        <Typography sx={{ ...amountSx, fontWeight: 600, fontSize: 17 }}>{money(a.amount)}</Typography>
        {Number(a.carried_amount) > 0 && (
          <Typography variant="caption" display="block" color="text.secondary" sx={amountSx}>
            {t("carriedOver", { value: money(Number(a.carried_amount)) })}
          </Typography>
        )}
        {Number(a.carried_amount) > 0 && Number(a.base_amount) > 0 && (
          <Typography variant="caption" display="block" color="text.secondary" sx={amountSx}>
            {t("monthConsumption", { value: money(Number(a.base_amount)) })}
          </Typography>
        )}
      </Box>

      <Stack spacing={0.5} sx={{ flex: "0 0 auto", minWidth: 150, alignItems: { xs: "flex-start", sm: "flex-start" } }}>
        <StatusChip state={s.state} daysUntilDue={s.daysUntilDue} dueDate={s.dueDate} recordStatus={a.status as any} />
        {a.isDeferred && !paid && (
          <Typography variant="caption" color="text.secondary">
            {t("deferredToNext")}
          </Typography>
        )}
        {carriedFromPrevious && (
          <Typography variant="caption" color="text.secondary">
            {t("includesCarried")}
          </Typography>
        )}
      </Stack>

      {canEdit && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: { xs: "auto", sm: 0 } }}>
          {!paid && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<CheckRounded />}
              onClick={() => onSetStatus("PAID")}
              aria-label={t("markPaidAria", { name: period })}
              sx={{ minHeight: 40, whiteSpace: "nowrap" }}
            >
              {t("markPaid")}
            </Button>
          )}
          <Tooltip title={t("actions")}>
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={`${t("actions")}: ${period}`}>
              <MoreVertRounded />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: "block" }}>
              {t("changeStatus")}
            </Typography>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem
                key={o.value}
                selected={a.status === o.value}
                onClick={() => {
                  close();
                  if (a.status !== o.value) onSetStatus(o.value);
                }}
              >
                <ListItemIcon>
                  {a.status === o.value ? <CheckRounded fontSize="small" /> : <RadioButtonUncheckedRounded fontSize="small" />}
                </ListItemIcon>
                {t(o.key)}
              </MenuItem>
            ))}
            <Divider />
            {!paid && (
              <MenuItem onClick={() => { close(); onDefer(); }}>
                <ListItemIcon><RedoRounded fontSize="small" /></ListItemIcon>
                {t("defer")}
              </MenuItem>
            )}
            <MenuItem onClick={() => { close(); onEdit(); }}>
              <ListItemIcon><EditRounded fontSize="small" /></ListItemIcon>
              {t("edit")}
            </MenuItem>
            <MenuItem onClick={() => { close(); onDelete(); }} sx={{ color: "error.main" }}>
              <ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineRounded fontSize="small" /></ListItemIcon>
              {t("delete")}
            </MenuItem>
          </Menu>
        </Stack>
      )}
    </Paper>
  );
}
