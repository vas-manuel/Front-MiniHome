import { DragEvent, useRef, useState } from "react";
import { Alert, Backdrop, Box, Button, CircularProgress, Snackbar, Stack, Typography } from "@mui/material";
import DocumentScannerRounded from "@mui/icons-material/DocumentScannerRounded";
import { useLanguage } from "../../i18n";
import { useSession } from "../../app/session";
import { formatMonthYear } from "../../utils/format";
import { ACCEPT_ATTR } from "./api";
import { useReceiptUpload } from "./useReceiptUpload";
import { ReceiptConfirmDialog } from "./ReceiptConfirmDialog";
import { UnreadableReceiptAlert } from "./UnreadableReceiptAlert";

const ERROR_KEYS: Record<string, string> = {
  NETWORK: "receiptUploadInterrupted",
  UPLOAD_NOT_FOUND: "receiptUnavailable",
  FORBIDDEN: "receiptForbidden",
  UNAUTHENTICATED: "receiptForbidden",
};

/* "Cargar boleta" (FR-001): visible solo para quien puede gestionar montos */
export function ReceiptUploadButton({ variant = "outlined" }: { variant?: "outlined" | "contained" }) {
  const { t, locale } = useLanguage();
  const { can } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { flow, start, confirm, replace, dismissConflict, cancel, reset } = useReceiptUpload((r) =>
    setToast(t("receiptSaved", { account: r.accountName, period: formatMonthYear(r.month, r.year, locale) }))
  );

  if (!can("bills")) return null;

  const pick = () => input.current?.click();
  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) start(file);
    if (input.current) input.current.value = "";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <>
      <Box
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{ borderRadius: 3, outline: dragging ? 2 : 0, outlineStyle: "dashed", outlineColor: "primary.main", outlineOffset: 4 }}
      >
        <Button variant={variant} startIcon={<DocumentScannerRounded />} onClick={pick} title={t("uploadReceiptHint")}>
          {dragging ? t("dropReceipt") : t("uploadReceipt")}
        </Button>
        <input ref={input} type="file" hidden accept={ACCEPT_ATTR} onChange={(e) => onFiles(e.target.files)} />
      </Box>

      <Backdrop open={flow.kind === "busy"} sx={{ zIndex: (th) => th.zIndex.modal + 1, color: "#fff" }}>
        <Stack alignItems="center" spacing={2} role="status" aria-live="polite">
          <CircularProgress color="inherit" />
          <Typography>{t("readingReceipt")}</Typography>
        </Stack>
      </Backdrop>

      {flow.kind === "review" && (
        <ReceiptConfirmDialog
          key={flow.analysis.uploadId}
          analysis={flow.analysis}
          saving={flow.saving}
          conflict={flow.conflict}
          error={flow.error}
          onConfirm={(form) => confirm(form)}
          onReplace={replace}
          onDismissConflict={dismissConflict}
          onCancel={cancel}
        />
      )}

      <UnreadableReceiptAlert
        reason={flow.kind === "unreadable" ? flow.reason : null}
        onClose={reset}
        onRetry={() => {
          reset();
          pick();
        }}
      />

      <Snackbar open={flow.kind === "error"} autoHideDuration={8000} onClose={reset}>
        <Alert severity="error" onClose={reset} variant="filled">
          {flow.kind === "error" ? t(ERROR_KEYS[flow.code] ?? "genericError") : ""}
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
