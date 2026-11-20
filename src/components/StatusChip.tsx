import { Box, useTheme } from "@mui/material";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import CalendarTodayRounded from "@mui/icons-material/CalendarTodayRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import { useLanguage } from "../i18n";
import { formatShortDate } from "../utils/format";
import type { BillState, AmountStatus } from "../features/thisMonth/monthBills";

interface Props {
  state: BillState;
  daysUntilDue?: number | null;
  dueDate?: Date | null;
  recordStatus?: AmountStatus | null;
}

/* Estado de una cuenta: siempre ícono + texto, nunca solo color (BRAND.md §3, §11) */
export function StatusChip({ state, daysUntilDue = null, dueDate = null, recordStatus = null }: Props) {
  const { t, locale } = useLanguage();
  const c = useTheme().palette.brandTokens;

  let fg = c.textSecondary;
  let bg = c.bg;
  let Icon = CalendarTodayRounded;
  let label: string;

  switch (state) {
    case "paid":
      fg = c.success;
      bg = c.successSubtle;
      Icon = CheckCircleRounded;
      label = t("statusPaid");
      break;
    case "overdue":
      fg = c.danger;
      bg = c.dangerSubtle;
      Icon = ErrorOutlineRounded;
      label =
        daysUntilDue !== null && daysUntilDue < 0
          ? t("statusOverdueDays", { days: Math.abs(daysUntilDue) })
          : t("statusOverdue");
      break;
    case "dueSoon":
      fg = c.warning;
      bg = c.warningSubtle;
      Icon = ScheduleRounded;
      label =
        daysUntilDue === 0
          ? t("statusDueToday")
          : daysUntilDue === 1
          ? t("statusDueTomorrow")
          : t("statusDueIn", { days: daysUntilDue ?? 0 });
      break;
    case "deferred":
      fg = c.info;
      bg = c.infoSubtle;
      Icon = RedoRounded;
      label = t("statusDeferred");
      break;
    case "noAmount":
      Icon = HelpOutlineRounded;
      label = t("noAmountThisMonth");
      break;
    default:
      label = dueDate
        ? t("statusDueOn", { date: formatShortDate(dueDate, locale) })
        : recordStatus === "CONFIRMED"
        ? t("statusConfirmed")
        : t("statusToConfirm");
  }

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: "8px",
        bgcolor: bg,
        color: fg,
        border: state === "pending" || state === "noAmount" ? `1px solid ${c.border}` : "none",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: "20px",
        whiteSpace: "nowrap",
      }}
    >
      <Icon sx={{ fontSize: 16 }} aria-hidden />
      {label}
    </Box>
  );
}
