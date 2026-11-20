import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useLanguage } from "../../i18n";
import { fetchPrivateFile } from "./api";

/* Muestra una boleta privada (imagen o PDF) descargándola con la sesión */
export function ReceiptPreview({ url, height = 520 }: { url?: string | null; height?: number | string }) {
  const { t } = useLanguage();
  const [file, setFile] = useState<{ url: string; type: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let alive = true;
    setFile(null);
    setFailed(false);
    if (!url) return;
    fetchPrivateFile(url)
      .then((f) => {
        if (!alive) return URL.revokeObjectURL(f.url);
        revoked = f.url;
        setFile(f);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [url]);

  const frame = {
    height,
    borderRadius: 2,
    border: 1,
    borderColor: "divider",
    bgcolor: "background.default",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  } as const;

  if (!url || failed) {
    return (
      <Box sx={frame}>
        <Typography color="text.secondary">{t("receiptNoPreview")}</Typography>
      </Box>
    );
  }
  if (!file) {
    return (
      <Box sx={frame}>
        <CircularProgress aria-label={t("loading")} />
      </Box>
    );
  }
  return (
    <Box sx={frame}>
      {file.type === "application/pdf" ? (
        <Box component="iframe" src={file.url} title={t("receiptViewFile")} sx={{ width: "100%", height: "100%", border: 0 }} />
      ) : (
        <Box
          component="img"
          src={file.url}
          alt={t("receiptViewFile")}
          sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      )}
    </Box>
  );
}
