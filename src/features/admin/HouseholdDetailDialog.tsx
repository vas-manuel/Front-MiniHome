/* Detalle de un hogar para el administrador: datos, historial de planes y pagos, cortesías */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { amountSx } from "../../brand/theme";
import { useLanguage } from "../../i18n";
import { useSession } from "../../app/session";
import { usePlanLabel } from "../plans/planLimit";
import { ADMIN_HOUSEHOLD_DETAIL, GRANT_PLAN, REVOKE_GRANT, SET_HOUSEHOLD_ACTIVE } from "./queries";
import { AdminState, clp, formatDate, GRANT_REASONS, GrantReason, STATE_CHIP } from "./adminFormat";

export interface AdminHouseholdRow {
  id: string;
  name: string;
  rut: string;
  createdAt: string | null;
  active: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  planId: string;
  planName: string;
  state: AdminState;
  billingPeriod: "MONTHLY" | "YEARLY" | null;
  endsAt: string | null;
  users: number;
  accounts: number;
  aiReadsThisMonth: number;
  aiCostThisMonthUsd: number;
  totalPaid: number;
  lastPaymentAt: string | null;
  grantReason: GrantReason | null;
  grantNote: string | null;
}

const REFRESH = ["AdminHouseholds", "AdminHouseholdDetail", "AdminOverview"];

export function HouseholdDetailDialog({
  row,
  plans,
  onClose,
}: {
  row: AdminHouseholdRow | null;
  plans: { id: string; name: string; priceMonthly: number }[];
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const planLabel = usePlanLabel();
  const { user } = useSession();
  const canEdit = user.role === "SYSTEM_ADMIN";
  const { data, loading } = useQuery(ADMIN_HOUSEHOLD_DETAIL, {
    variables: { householdId: row?.id },
    skip: !row,
    fetchPolicy: "cache-and-network",
  });
  const [grant, { loading: granting }] = useMutation(GRANT_PLAN, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const [revoke, { loading: revoking }] = useMutation(REVOKE_GRANT, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const [setActive, { loading: toggling }] = useMutation(SET_HOUSEHOLD_ACTIVE, { refetchQueries: REFRESH, awaitRefetchQueries: true });

  const paidPlans = plans.filter((p) => Number(p.priceMonthly) > 0);
  const [mode, setMode] = useState<"view" | "grant" | "revoke">("view");
  const [planId, setPlanId] = useState("");
  const [duration, setDuration] = useState<"forever" | "months">("forever");
  const [months, setMonths] = useState("3");
  const [reason, setReason] = useState<GrantReason>("OWN_USE");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    setMode("view");
    setErr(null);
    setDone(null);
    setNote("");
    setPlanId(paidPlans[paidPlans.length - 1]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  if (!row) return null;
  const renewing = row.state === "PAYING" || row.state === "PAST_DUE";
  const message = (e: any) => e?.graphQLErrors?.[0]?.message ?? t("genericError");

  const submitGrant = async () => {
    setErr(null);
    try {
      await grant({
        variables: {
          householdId: row.id,
          planId,
          months: duration === "months" ? Number(months) : null,
          reason,
          note: note.trim() || null,
        },
      });
      setMode("view");
      setDone(t("adminGrantDone"));
    } catch (e) {
      setErr(message(e));
    }
  };
  const submitRevoke = async () => {
    setErr(null);
    try {
      await revoke({ variables: { householdId: row.id, note: note.trim() || null } });
      setMode("view");
      setDone(t("adminRevokeDone"));
    } catch (e) {
      setErr(message(e));
    }
  };
  const toggleActive = async () => {
    setErr(null);
    try {
      await setActive({ variables: { id: row.id, active: !row.active } });
    } catch (e) {
      setErr(message(e));
    }
  };

  const changes = data?.adminHouseholdDetail?.changes ?? [];
  const payments = data?.adminHouseholdDetail?.payments ?? [];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <span>{row.name}</span>
          <Chip size="small" label={t(`adminState_${row.state}`)} color={STATE_CHIP[row.state].color} variant={STATE_CHIP[row.state].variant} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {done && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDone(null)}>{done}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert>}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Field label={t("adminOwner")} value={row.ownerName ? `${row.ownerName} · ${row.ownerEmail ?? ""}` : "—"} wide />
          <Field label="RUT" value={row.rut} />
          <Field label={t("plan")} value={`${planLabel(row.planName)}${row.billingPeriod ? ` · ${t(row.billingPeriod === "YEARLY" ? "plansYearly" : "plansMonthly")}` : ""}`} />
          <Field label={t("adminEnds")} value={row.state === "FREE" ? "—" : row.endsAt ? formatDate(row.endsAt, locale) : t("adminNoExpiry")} />
          <Field label={t("adminCreated")} value={formatDate(row.createdAt, locale)} />
          <Field label={t("adminMembers")} value={String(row.users)} />
          <Field label={t("navAccountsShort")} value={String(row.accounts)} />
          <Field label={t("adminAiReads")} value={String(row.aiReadsThisMonth)} />
          <Field label={t("adminTotalPaid")} value={clp(row.totalPaid, locale)} />
          {row.state === "COMPLIMENTARY" && (
            <Field
              label={t("adminGrantReason")}
              value={`${t(`adminGrant_${row.grantReason ?? "OTHER"}`)}${row.grantNote ? ` — ${row.grantNote}` : ""}`}
              wide
            />
          )}
        </Grid>

        {mode === "grant" && (
          <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "action.hover" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t("adminGrantTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("adminGrantHint")}
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField select label={t("plan")} value={planId} onChange={(e) => setPlanId(e.target.value)} sx={{ minWidth: 180 }}>
                  {paidPlans.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {planLabel(p.name)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label={t("adminGrantReason")} value={reason} onChange={(e) => setReason(e.target.value as GrantReason)} sx={{ minWidth: 200 }}>
                  {GRANT_REASONS.map((r) => (
                    <MenuItem key={r} value={r}>
                      {t(`adminGrant_${r}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <ToggleButtonGroup size="small" exclusive value={duration} onChange={(_, v) => v && setDuration(v)}>
                  <ToggleButton value="forever">{t("adminNoExpiry")}</ToggleButton>
                  <ToggleButton value="months">{t("adminForMonths")}</ToggleButton>
                </ToggleButtonGroup>
                {duration === "months" && (
                  <TextField
                    label={t("adminMonths")}
                    value={months}
                    onChange={(e) => setMonths(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    size="small"
                    sx={{ width: 110 }}
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                  />
                )}
              </Stack>
              <TextField label={t("adminNote")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("adminNotePlaceholder")} multiline minRows={2} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={() => setMode("view")}>{t("cancel")}</Button>
                <Button variant="contained" onClick={submitGrant} disabled={granting || !planId || (duration === "months" && !Number(months))}>
                  {t("adminGrantConfirm")}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {mode === "revoke" && (
          <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "action.hover" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t("adminRevokeTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("adminRevokeHint")}
            </Typography>
            <TextField label={t("adminNote")} value={note} onChange={(e) => setNote(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setMode("view")}>{t("cancel")}</Button>
              <Button variant="contained" color="error" onClick={submitRevoke} disabled={revoking}>
                {t("adminRevokeConfirm")}
              </Button>
            </Stack>
          </Box>
        )}

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
          {t("adminHistory")}
        </Typography>
        {loading && !data ? (
          <Skeleton height={80} />
        ) : changes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("adminNoHistory")}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} sx={{ mb: 2 }}>
            {changes.map((c: any) => (
              <Stack key={c.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ py: 1 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {c.oldPlanName ? `${planLabel(c.oldPlanName)} → ` : ""}
                    {planLabel(c.newPlanName)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`adminReason_${(c.reason ?? "ADMIN").replace(/^GRANT_.*/, "GRANT")}`)}
                    {c.reason?.startsWith("GRANT_") ? ` · ${t(`adminGrant_${c.reason.slice(6)}`)}` : ""}
                    {c.changedByName ? ` · ${c.changedByName}` : ""}
                    {c.note ? ` — ${c.note}` : ""}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  {formatDate(c.changedAt, locale)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}

        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
          {t("adminPaymentsTitle")}
        </Typography>
        {payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("adminNoPayments")}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />}>
            {payments.map((p: any) => (
              <Stack key={p.id} direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
                <Typography variant="body2">
                  {formatDate(p.paidAt, locale)} · {t(`adminPayment_${p.status}`)}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={amountSx}>
                  {clp(p.amount, locale)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, py: 2 }}>
        {canEdit && mode === "view" && (
          <>
            <Button color={row.active ? "error" : "primary"} onClick={toggleActive} disabled={toggling} sx={{ mr: "auto" }}>
              {row.active ? t("adminDeactivate") : t("adminActivate")}
            </Button>
            {row.state === "COMPLIMENTARY" && (
              <Button color="error" variant="outlined" onClick={() => setMode("revoke")}>
                {t("adminRevoke")}
              </Button>
            )}
            <Button variant="contained" onClick={() => setMode("grant")} disabled={renewing} title={renewing ? t("adminGrantBlocked") : undefined}>
              {row.state === "COMPLIMENTARY" ? t("adminGrantChange") : t("adminGrant")}
            </Button>
          </>
        )}
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
      {canEdit && renewing && mode === "view" && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 3, pb: 2 }}>
          {t("adminGrantBlocked")}
        </Typography>
      )}
    </Dialog>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <Grid size={{ xs: 12, sm: wide ? 12 : 6, md: wide ? 8 : 4 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Grid>
  );
}
