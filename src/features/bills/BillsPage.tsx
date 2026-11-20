import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  ListSubheader,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { useLanguage } from "../../i18n";
import { useSession } from "../../app/session";
import { EmptyState, PageHeader } from "../../components/common";
import { BillAmount, includesCarriedFromPrevious, nextPeriod, sortByPeriod } from "./billsLogic";
import { AmountRow } from "./AmountRow";
import { AmountFormDialog, AmountFormValues, DeleteAmountDialog } from "./AmountDialogs";
import { AmountHistory, VariableSummaryCards } from "./BillsInsights";
import {
  CREATE_AMOUNT,
  DEFER_AMOUNT,
  DELETE_FROM_PERIOD,
  DELETE_SINGLE,
  GET_ACCOUNTS,
  GET_AMOUNTS,
  GET_AMOUNTS_ALL,
  UPDATE_AMOUNT,
  UPDATE_STATUS,
} from "./queries";

type AccountType = "FIXED" | "VARIABLE";
interface Account {
  id: string;
  name: string;
  due_day?: number | null;
  group?: { id: string; name: string } | null;
}

export default function BillsPage() {
  const { t } = useLanguage();
  const { can } = useSession();
  const canEdit = can("bills");
  const [params, setParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // La selección vive en la URL: se puede enlazar desde "Este mes" y sobrevive al recargar
  const type: AccountType = params.get("type") === "VARIABLE" ? "VARIABLE" : "FIXED";
  const accountId = params.get("account") || "";
  const year = Number(params.get("year")) || currentYear;
  const updateParams = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? merged.set(k, v) : merged.delete(k)));
    setParams(merged, { replace: true });
  };

  const { data: accountsData } = useQuery<{ billAccounts: Account[] }>(GET_ACCOUNTS, { variables: { type } });
  const accounts = accountsData?.billAccounts ?? [];
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  const { data: amountsData, refetch } = useQuery<{ billAccountAmounts: BillAmount[] }>(GET_AMOUNTS, {
    variables: { bill_account_id: accountId, year },
    skip: !selectedAccount,
  });
  const { data: allData, refetch: refetchAll } = useQuery<{ billAccountAmounts: BillAmount[] }>(GET_AMOUNTS_ALL, {
    variables: { bill_account_id: accountId },
    skip: !selectedAccount,
  });

  const [createAmount] = useMutation(CREATE_AMOUNT);
  const [updateStatus] = useMutation(UPDATE_STATUS);
  const [updateAmount] = useMutation(UPDATE_AMOUNT);
  const [deferAmount] = useMutation(DEFER_AMOUNT);
  const [deleteFromPeriod] = useMutation(DELETE_FROM_PERIOD);
  const [deleteSingle] = useMutation(DELETE_SINGLE);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BillAmount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillAmount | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const yearAmounts = useMemo(() => sortByPeriod(amountsData?.billAccountAmounts ?? []), [amountsData]);
  const allAmounts = allData?.billAccountAmounts ?? [];
  const isVariable = type === "VARIABLE";

  // Si la cuenta de la URL no es de este tipo, limpiar la selección
  useEffect(() => {
    if (accountsData && accountId && !selectedAccount) updateParams({ account: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsData, accountId, selectedAccount]);

  const reload = async () => {
    await Promise.all([refetch(), refetchAll()]);
  };

  const run = async (fn: () => Promise<unknown>, message = t("saved")) => {
    try {
      await fn();
      await reload();
      setToast(message);
    } catch {
      setToast(t("genericError"));
    }
  };

  /* Mismas variables que la versión anterior para cada caso (fijo/consumo, crear/editar) */
  const handleSave = async (v: AmountFormValues) => {
    if (!selectedAccount) return;
    if (editing) {
      await updateAmount({
        variables: isVariable
          ? { id: editing.id, year, month: v.month, status: v.status, quantity: v.quantity, unit_price: v.unitPrice, purchase_date: v.purchaseDate }
          : { id: editing.id, year, month: v.month, amount: v.amount, status: v.status },
      });
    } else {
      await createAmount({
        variables: isVariable
          ? {
              bill_account_id: selectedAccount.id,
              year,
              month: v.month,
              amount: null,
              installments: 1,
              status: v.status,
              product_name: selectedAccount.name,
              quantity: v.quantity,
              unit_price: v.unitPrice,
              purchase_date: v.purchaseDate,
            }
          : { bill_account_id: selectedAccount.id, year, month: v.month, amount: v.amount, installments: v.installments, status: v.status },
      });
    }
    setFormOpen(false);
    await reload();
    setToast(t("saved"));
  };

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    accounts.forEach((a) => {
      const g = a.group?.name || t("noGroup");
      (groups[g] ||= []).push(a);
    });
    return Object.entries(groups);
  }, [accounts, t]);

  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <Box>
      <PageHeader
        title={t("amountManagement")}
        subtitle={t("amountManagementSubtitle")}
        actions={
          selectedAccount &&
          canEdit && (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t("newAmount")}
            </Button>
          )
        }
      />

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => v && updateParams({ type: v === "FIXED" ? null : v, account: null })}
            size="small"
            aria-label={t("selectAccount")}
          >
            <ToggleButton value="FIXED">{t("fixedAccounts")}</ToggleButton>
            <ToggleButton value="VARIABLE">{t("variableAccounts")}</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            select
            fullWidth
            label={t("selectAccount")}
            value={selectedAccount?.id ?? ""}
            onChange={(e) => updateParams({ account: e.target.value })}
          >
            {groupedAccounts.flatMap(([group, items]) => [
              <ListSubheader key={`g-${group}`}>{group}</ListSubheader>,
              ...items.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              )),
            ])}
          </TextField>
          <TextField
            select
            label={t("year")}
            value={year}
            onChange={(e) => updateParams({ year: e.target.value === String(currentYear) ? null : e.target.value })}
            sx={{ minWidth: 120 }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {!selectedAccount ? (
        <Paper>
          <EmptyState title={t("selectAccountHint")} />
        </Paper>
      ) : (
        <>
          {isVariable && amountsData && (
            <VariableSummaryCards yearAmounts={yearAmounts} allAmounts={allAmounts} formMonth={currentMonth} year={year} />
          )}

          {yearAmounts.length === 0 ? (
            <Alert severity="info">{t("noAmountsYet", { year })}</Alert>
          ) : (
            <Stack spacing={1}>
              {yearAmounts.map((a) => (
                <AmountRow
                  key={a.id}
                  amount={a}
                  isVariable={isVariable}
                  dueDay={selectedAccount.due_day}
                  carriedFromPrevious={includesCarriedFromPrevious(a, allAmounts)}
                  canEdit={canEdit}
                  onSetStatus={(status) => run(() => updateStatus({ variables: { id: a.id, status } }))}
                  onDefer={() => {
                    const next = nextPeriod(a.month, a.year);
                    run(() => deferAmount({ variables: { id: a.id, targetYear: next.year, targetMonth: next.month } }));
                  }}
                  onEdit={() => {
                    setEditing(a);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(a)}
                />
              ))}
            </Stack>
          )}

          {allAmounts.length > 0 && <AmountHistory allAmounts={allAmounts} />}
        </>
      )}

      <AmountFormDialog
        open={formOpen}
        editing={editing}
        isVariable={isVariable}
        defaultMonth={currentMonth}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSave}
      />

      <DeleteAmountDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async (mode) => {
          if (!deleteTarget || !selectedAccount) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          await run(() =>
            mode === "ONE"
              ? deleteSingle({ variables: { id: target.id } })
              : deleteFromPeriod({ variables: { bill_account_id: selectedAccount.id, year: target.year, month: target.month } })
          );
        }}
      />

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
}
