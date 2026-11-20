import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import { useLanguage } from "../../i18n";
import { ReceiptPreview } from "./ReceiptPreview";

/* Ver la boleta adjunta a un monto (FR-016); cualquier persona del hogar puede verla */
export function ReceiptViewButton({ receipt, title }: { receipt: { url: string }; title: string }) {
  const { t } = useLanguage();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title={t("receiptViewFile")}>
        <IconButton onClick={() => setOpen(true)} aria-label={`${t("receiptViewFile")}: ${title}`}>
          <ReceiptLongRounded />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={fullScreen} maxWidth="md" fullWidth>
        <DialogTitle>
          {t("receiptViewFile")} · {title}
        </DialogTitle>
        <DialogContent dividers>{open && <ReceiptPreview url={receipt.url} height={fullScreen ? "70vh" : 640} />}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
