/* Gestión de categorías de gasto: nombre, presupuesto mensual, orden y eliminación */
import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import { useLanguage } from "../../i18n";
import { CREATE_CATEGORY, DELETE_CATEGORY, ExpenseCategory, REORDER_CATEGORIES, UPDATE_CATEGORY } from "./queries";
import { formatNumber, parseNumber } from "./purchaseForm";

const REFRESH = ["ExpenseCategories", "Consumption", "HomeConsumption"];

interface Row {
  id: string;
  name: string;
  budget: string;
}

const toRow = (c: ExpenseCategory): Row => ({ id: c.id, name: c.name, budget: c.monthlyBudget ? formatNumber(c.monthlyBudget) : "" });

export function CategoriesDialog({ open, categories, onClose }: { open: boolean; categories: ExpenseCategory[]; onClose: () => void }) {
  const { t } = useLanguage();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState<Row[]>([]);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<{ id: string; moveTo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [update] = useMutation(UPDATE_CATEGORY, { refetchQueries: REFRESH });
  const [reorder] = useMutation(REORDER_CATEGORIES, { refetchQueries: REFRESH });
  const [remove] = useMutation(DELETE_CATEGORY, { refetchQueries: REFRESH });
  const [create] = useMutation(CREATE_CATEGORY, { refetchQueries: REFRESH });

  useEffect(() => {
    if (open) setRows(categories.map(toRow));
  }, [open, categories]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err?.graphQLErrors?.[0]?.message ?? t("genericError"));
    } finally {
      setBusy(false);
    }
  };

  /* Guarda una fila al salir del campo, solo si cambió */
  const saveRow = (row: Row) => {
    const original = categories.find((c) => c.id === row.id);
    if (!original) return;
    const budget = row.budget.trim() ? parseNumber(row.budget) : null;
    const nameChanged = row.name.trim() !== original.name;
    const budgetChanged = (budget ?? null) !== (original.monthlyBudget ?? null);
    if (!nameChanged && !budgetChanged) return;
    run(() =>
      update({
        variables: {
          id: row.id,
          ...(nameChanged ? { name: row.name.trim() } : {}),
          ...(budgetChanged ? { monthlyBudget: budget } : {}),
        },
      })
    );
  };

  const move = (index: number, delta: number) => {
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setRows(next);
    run(() => reorder({ variables: { ids: next.map((r) => r.id) } }));
  };

  const setRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const deletingName = rows.find((r) => r.id === deleting?.id)?.name ?? "";

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth aria-labelledby="categories-title">
      <DialogTitle id="categories-title">
        {t("categoriesTitle")}
        <Typography variant="body2" color="text.secondary">
          {t("categoriesSubtitle")}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Stack spacing={1.5}>
          {rows.map((r, i) => (
            <Box key={r.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr auto", sm: "2fr 1.2fr auto" }, gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                label={t("categoryName")}
                value={r.name}
                onChange={(e) => setRow(r.id, { name: e.target.value })}
                onBlur={() => saveRow(r)}
                sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}
              />
              <TextField
                size="small"
                label={t("categoryBudget")}
                placeholder={t("categoryNoBudget")}
                value={r.budget}
                onChange={(e) => setRow(r.id, { budget: e.target.value })}
                onBlur={() => saveRow(r)}
                inputProps={{ inputMode: "decimal" }}
              />
              <Stack direction="row">
                <Tooltip title={t("moveUp")}>
                  <span>
                    <IconButton size="small" aria-label={t("moveUp")} disabled={i === 0 || busy} onClick={() => move(i, -1)}>
                      <ArrowUpwardRounded fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("moveDown")}>
                  <span>
                    <IconButton size="small" aria-label={t("moveDown")} disabled={i === rows.length - 1 || busy} onClick={() => move(i, 1)}>
                      <ArrowDownwardRounded fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("delete")}>
                  <span>
                    <IconButton
                      size="small"
                      aria-label={`${t("delete")}: ${r.name}`}
                      disabled={rows.length < 2 || busy}
                      onClick={() => setDeleting({ id: r.id, moveTo: rows.find((x) => x.id !== r.id)!.id })}
                    >
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          <TextField size="small" fullWidth label={t("categoryNew")} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button
            startIcon={<AddRounded />}
            disabled={!newName.trim() || busy}
            onClick={() => run(async () => {
              await create({ variables: { name: newName.trim() } });
              setNewName("");
            })}
          >
            {t("add")}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" onClick={onClose}>
          {t("close")}
        </Button>
      </DialogActions>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("categoryDeleteTitle", { name: deletingName })}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{t("categoryDeleteText")}</Typography>
          <TextField
            select
            fullWidth
            label={t("categoryMoveTo")}
            value={deleting?.moveTo ?? ""}
            onChange={(e) => deleting && setDeleting({ ...deleting, moveTo: e.target.value })}
          >
            {rows
              .filter((r) => r.id !== deleting?.id)
              .map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleting(null)}>{t("cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const target = deleting;
              setDeleting(null);
              if (target) run(() => remove({ variables: { id: target.id, moveToId: target.moveTo } }));
            }}
          >
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
