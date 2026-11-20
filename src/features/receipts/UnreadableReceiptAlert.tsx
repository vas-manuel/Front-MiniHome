import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import { useLanguage } from "../../i18n";
import type { UnreadableKind } from "./useReceiptUpload";

/* FR-004: la boleta no se procesa; se explica el motivo y qué intentar (BRAND §9: sin culpar) */
export function UnreadableReceiptAlert({
  reason,
  onClose,
  onRetry,
}: {
  reason: UnreadableKind | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Dialog open={Boolean(reason)} onClose={onClose} maxWidth="xs" fullWidth aria-describedby="unreadable-reason">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <ErrorOutlineRounded color="error" aria-hidden />
          <span>{t("unreadableTitle")}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography id="unreadable-reason" role="alert" sx={{ mb: 1 }}>
          {reason ? t(`unreadable${reason}`) : ""}
        </Typography>
        <Typography color="text.secondary">
          {reason === "PROTECTED_PDF" ? t("unreadableTipsPdf") : t("unreadableTips")}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("close")}</Button>
        <Button variant="contained" onClick={onRetry} autoFocus>
          {t("tryAnotherFile")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
