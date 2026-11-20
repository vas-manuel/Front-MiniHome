import { ReactNode } from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { BrandIcon } from "../brand/Logo";
import { useLanguage } from "../i18n";
import { formatMonthYear } from "../utils/format";

/* Encabezado de página: título (Poppins), bajada y acciones a la derecha */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "flex-end" }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

/* Estado vacío amable con la mascota (BRAND.md §2: estados vacíos, celebraciones, errores) */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 6, px: 2, textAlign: "center" }}>
      <BrandIcon size={96} title="" />
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  );
}

/* Selector de mes: anterior / siguiente / volver a hoy */
export function MonthSwitcher({
  year,
  month,
  onChange,
  maxMonthsAhead,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  maxMonthsAhead?: number;
}) {
  const { t, locale } = useLanguage();
  const today = new Date();
  const isCurrent = year === today.getFullYear() && month === today.getMonth() + 1;
  const offset = (year - today.getFullYear()) * 12 + (month - (today.getMonth() + 1));
  const canGoNext = maxMonthsAhead === undefined || offset < maxMonthsAhead;

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onChange(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title={t("previousMonth")}>
        <IconButton onClick={() => shift(-1)} aria-label={t("previousMonth")}>
          <ChevronLeftRounded />
        </IconButton>
      </Tooltip>
      <Typography
        aria-live="polite"
        sx={{ minWidth: 150, textAlign: "center", fontWeight: 600 }}
      >
        {formatMonthYear(month, year, locale)}
      </Typography>
      <Tooltip title={t("nextMonth")}>
        <span>
          <IconButton onClick={() => shift(1)} disabled={!canGoNext} aria-label={t("nextMonth")}>
            <ChevronRightRounded />
          </IconButton>
        </span>
      </Tooltip>
      {!isCurrent && (
        <Button
          size="small"
          onClick={() => onChange(today.getFullYear(), today.getMonth() + 1)}
        >
          {t("backToToday")}
        </Button>
      )}
    </Stack>
  );
}
