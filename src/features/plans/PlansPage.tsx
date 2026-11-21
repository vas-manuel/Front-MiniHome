/*
 * Planes y suscripción del hogar: plan vigente, uso, contratar (Flow) y cancelar.
 * El backend decide el plan vigente y los límites; aquí solo se muestran.
 */
import { useEffect, useRef, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { PageHeader } from "../../components/common";
import { useLanguage } from "../../i18n";
import { formatMoney } from "../../utils/format";
import { gqlErrorCode, PLANS_PATH, usePlanLabel } from "./planLimit";
import {
  BillingPeriod,
  checkoutBlock,
  CheckoutBlock,
  parsePaymentReturn,
  PaymentReturn,
  PlanInfo,
  planPrice,
  planStatus,
  SubscriptionState,
  usagePercent,
  yearlySavingMonths,
} from "./plansLogic";

const PLANS_PAGE = gql`
  query PlansPage {
    me {
      id
      role
      household {
        id
        plan {
          id
          name
        }
        subscriptionStatus
        subscriptionEndsAt
        daysRemaining
        totalUsers
        totalBillAccounts
        userLimit
        accountLimit
        aiReadsUsed
        aiReadsLimit
      }
    }
    plans {
      id
      name
      maxUsers
      maxBillAccounts
      maxHistoryMonths
      maxAiReadsMonthly
      priceMonthly
      priceYearly
    }
    mySubscription {
      id
      status
      billingPeriod
      currentPeriodEnd
      cancelAtPeriodEnd
      plan {
        id
        name
      }
    }
    onlinePaymentsEnabled
  }
`;

const START_CHECKOUT = gql`
  mutation StartPlanCheckout($planId: ID!, $period: BillingPeriod!) {
    startPlanCheckout(planId: $planId, period: $period)
  }
`;

const SYNC_SUBSCRIPTION = gql`
  mutation SyncMySubscription {
    syncMySubscription {
      id
      status
      currentPeriodEnd
      cancelAtPeriodEnd
    }
  }
`;

const CANCEL_SUBSCRIPTION = gql`
  mutation CancelMySubscription {
    cancelMySubscription {
      id
      status
      currentPeriodEnd
      cancelAtPeriodEnd
    }
  }
`;

const REFRESH = ["PlansPage", "Me"];

const RETURN_SEVERITY: Record<PaymentReturn, "success" | "info" | "warning" | "error"> = {
  ok: "success",
  pendiente: "info",
  rechazado: "warning",
  error: "error",
};

export default function PlansPage() {
  const { t, locale } = useLanguage();
  const planLabel = usePlanLabel();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, error: loadError } = useQuery(PLANS_PAGE, { fetchPolicy: "cache-and-network" });
  const [startCheckout] = useMutation(START_CHECKOUT);
  const [syncSubscription] = useMutation(SYNC_SUBSCRIPTION, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const [cancelSubscription, { loading: canceling }] = useMutation(CANCEL_SUBSCRIPTION, {
    refetchQueries: REFRESH,
    awaitRefetchQueries: true,
  });

  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturn | null>(null);
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const handledReturn = useRef(false);

  // Al volver de Flow (?pago=...): avisar, consultar el estado y limpiar la URL
  useEffect(() => {
    if (handledReturn.current) return;
    const ret = parsePaymentReturn(location.search);
    if (!ret) return;
    handledReturn.current = true;
    setPaymentReturn(ret);
    navigate(PLANS_PATH, { replace: true });
    if (ret === "ok" || ret === "pendiente") syncSubscription().catch(() => undefined);
  }, [location.search, navigate, syncSubscription]);

  const date = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "";
  const clp = (v: number) => formatMoney(v, "CLP", locale);

  if (loading && !data) {
    return (
      <Box>
        <PageHeader title={t("plansTitle")} subtitle={t("plansSubtitle")} />
        <Skeleton variant="rounded" height={180} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }
  if (loadError || !data?.me?.household) {
    return (
      <Box>
        <PageHeader title={t("plansTitle")} />
        <Alert severity="error">{t("genericError")}</Alert>
      </Box>
    );
  }

  const household = data.me.household;
  const role: string = data.me.role;
  const sub: SubscriptionState | null = data.mySubscription ?? null;
  const plans: PlanInfo[] = data.plans ?? [];
  const status = planStatus(household, sub);
  const currentName = household.plan?.name ?? "GRATIS";
  const isOwner = role === "OWNER";

  const choose = async (plan: PlanInfo) => {
    setActionError(null);
    setRedirecting(plan.id);
    try {
      const { data: res } = await startCheckout({ variables: { planId: plan.id, period } });
      window.location.assign(res.startPlanCheckout);
    } catch (err: any) {
      setRedirecting(null);
      const code = gqlErrorCode(err);
      setActionError(
        code === "SUBSCRIPTION_EXISTS"
          ? t("plansBlockedHasSubscription")
          : code === "NOT_CONFIGURED"
          ? t("plansBlockedUnavailable")
          : t("plansCheckoutError")
      );
    }
  };

  const doCancel = async () => {
    setActionError(null);
    try {
      await cancelSubscription();
      setConfirmCancel(false);
    } catch {
      setConfirmCancel(false);
      setActionError(t("plansCancelError"));
    }
  };

  const statusText = (() => {
    switch (status.kind) {
      case "trial":
        return t("plansStatusTrial", { plan: planLabel(currentName), days: status.daysRemaining ?? 0, date: date(status.until) });
      case "paid":
        return t("plansStatusPaid", { date: date(status.until) });
      case "pending":
        return t("plansStatusPending");
      case "pastDue":
        return t("plansStatusPastDue");
      case "canceling":
        return t("plansStatusCanceling", { date: date(status.until) });
      case "manual":
        return status.until ? t("plansStatusManualUntil", { date: date(status.until) }) : t("plansStatusManual");
      default:
        return t("plansStatusFree");
    }
  })();

  const canCancel = isOwner && sub && !sub.cancelAtPeriodEnd && (sub.status === "ACTIVE" || sub.status === "PAST_DUE");

  return (
    <Box>
      <PageHeader title={t("plansTitle")} subtitle={t("plansSubtitle")} />

      <Stack spacing={2} sx={{ mb: 3 }}>
        {paymentReturn && (
          <Alert severity={RETURN_SEVERITY[paymentReturn]} onClose={() => setPaymentReturn(null)}>
            {t(`plansReturn_${paymentReturn}`)}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}
      </Stack>

      {/* Plan vigente y uso */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, mb: 4 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {t("plansCurrent")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" component="p">
                {planLabel(currentName)}
              </Typography>
              {status.kind === "trial" && <Chip size="small" color="info" label={t("plansChipTrial")} />}
              {status.kind === "pastDue" && <Chip size="small" color="warning" label={t("plansChipPastDue")} />}
              {sub && status.kind === "paid" && (
                <Chip size="small" variant="outlined" label={t(sub.billingPeriod === "YEARLY" ? "plansYearly" : "plansMonthly")} />
              )}
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {statusText}
            </Typography>
          </Box>
          {canCancel && (
            <Button color="inherit" variant="outlined" onClick={() => setConfirmCancel(true)} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
              {t("plansCancel")}
            </Button>
          )}
        </Stack>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <UsageMeter label={t("plansUsageUsers")} used={household.totalUsers} limit={household.userLimit} />
          <UsageMeter label={t("plansUsageAccounts")} used={household.totalBillAccounts} limit={household.accountLimit} />
          <UsageMeter label={t("plansUsageAi")} used={household.aiReadsUsed} limit={household.aiReadsLimit} />
        </Grid>
      </Paper>

      {/* Catálogo */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2">
          {t("plansChoose")}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={period}
          onChange={(_, v) => v && setPeriod(v)}
          aria-label={t("plansPeriod")}
        >
          <ToggleButton value="MONTHLY">{t("plansMonthly")}</ToggleButton>
          <ToggleButton value="YEARLY">{t("plansYearly")}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Grid container spacing={2}>
        {plans.map((plan) => {
          const block = checkoutBlock({ plan, role, onlinePaymentsEnabled: Boolean(data.onlinePaymentsEnabled), subscription: sub });
          const isCurrent = plan.name === currentName;
          const price = planPrice(plan, period);
          const saving = period === "YEARLY" ? yearlySavingMonths(plan) : 0;
          return (
            <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  border: 2,
                  borderColor: isCurrent ? "primary.main" : "transparent",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" component="h3">
                    {planLabel(plan.name)}
                  </Typography>
                  {isCurrent && <Chip size="small" color="primary" label={t("plansYourPlan")} />}
                </Stack>
                <Typography variant="h4" component="p" sx={{ mt: 1, fontVariantNumeric: "tabular-nums" }}>
                  {price > 0 ? clp(price) : t("plansFreePrice")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 20 }}>
                  {price > 0 ? t(period === "YEARLY" ? "plansPerYear" : "plansPerMonth") : t("plansForever")}
                  {saving > 0 ? ` · ${t("plansYearlySaving", { months: saving })}` : ""}
                </Typography>

                <Stack component="ul" spacing={1} sx={{ listStyle: "none", p: 0, my: 2.5, flexGrow: 1 }}>
                  <Feature text={limitText(t, "plansFeatureUsers", plan.maxUsers)} />
                  <Feature text={limitText(t, "plansFeatureAccounts", plan.maxBillAccounts)} />
                  <Feature text={limitText(t, "plansFeatureHistory", plan.maxHistoryMonths)} />
                  <Feature text={limitText(t, "plansFeatureAi", plan.maxAiReadsMonthly)} />
                </Stack>

                <PlanAction
                  block={block}
                  busy={redirecting === plan.id}
                  disabled={redirecting !== null}
                  onChoose={() => choose(plan)}
                  t={t}
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        {t("plansFootnote")}
      </Typography>

      <Dialog open={confirmCancel} onClose={() => !canceling && setConfirmCancel(false)}>
        <DialogTitle>{t("plansCancelTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("plansCancelBody", { date: date(sub?.currentPeriodEnd) })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(false)} disabled={canceling}>
            {t("plansCancelKeep")}
          </Button>
          <Button color="error" variant="contained" onClick={doCancel} disabled={canceling}>
            {canceling ? <CircularProgress size={20} color="inherit" /> : t("plansCancelConfirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

type T = (key: string, vars?: Record<string, string | number>) => string;

function limitText(t: T, key: string, limit: number | null) {
  return limit === null ? t(`${key}Unlimited`) : t(key, { n: limit });
}

function Feature({ text }: { text: string }) {
  return (
    <Stack component="li" direction="row" spacing={1} alignItems="flex-start">
      <CheckRounded fontSize="small" color="success" sx={{ mt: "2px" }} />
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const { t } = useLanguage();
  const pct = usagePercent(used, limit);
  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {limit === null ? t("plansUsageUnlimited", { used }) : `${used} / ${limit}`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct ?? 0}
        color={pct !== null && pct >= 100 ? "warning" : "primary"}
        sx={{ mt: 1, height: 8, borderRadius: 4, opacity: pct === null ? 0.35 : 1 }}
        aria-label={label}
      />
    </Grid>
  );
}

function PlanAction({
  block,
  busy,
  disabled,
  onChoose,
  t,
}: {
  block: CheckoutBlock;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
  t: T;
}) {
  if (block === "free") return <Box sx={{ minHeight: 42 }} />;
  if (block === "current") {
    return (
      <Button variant="outlined" disabled fullWidth size="large">
        {t("plansYourPlan")}
      </Button>
    );
  }
  if (block) {
    return (
      <Stack spacing={1}>
        <Button variant="contained" disabled fullWidth size="large">
          {t("plansChooseButton")}
        </Button>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t(
            block === "notOwner"
              ? "plansBlockedNotOwner"
              : block === "unavailable"
              ? "plansBlockedUnavailable"
              : "plansBlockedHasSubscription"
          )}
        </Typography>
      </Stack>
    );
  }
  return (
    <Button variant="contained" fullWidth size="large" onClick={onChoose} disabled={disabled}>
      {busy ? <CircularProgress size={22} color="inherit" /> : t("plansChooseButton")}
    </Button>
  );
}
