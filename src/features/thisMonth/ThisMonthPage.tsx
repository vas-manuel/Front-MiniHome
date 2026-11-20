import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { useLanguage } from "../../i18n";
import { useSession } from "../../app/session";
import { CategoryTile } from "../../brand/categories";
import { brand } from "../../brand/tokens";
import { amountSx } from "../../brand/theme";
import { BrandIcon } from "../../brand/Logo";
import { StatusChip } from "../../components/StatusChip";
import { EmptyState, MonthSwitcher, PageHeader } from "../../components/common";
import { formatMonthName, formatShortDate } from "../../utils/format";
import { BillState, groupByState, MonthBill, summarizeMonth } from "./monthBills";
import { useMonthBills } from "./useMonthBills";

const SECTION_LABEL: Record<BillState, string> = {
  overdue: "overdueSection",
  dueSoon: "dueSoonSection",
  pending: "pendingSection",
  deferred: "statusDeferred",
  paid: "paidSection",
  noAmount: "noAmountsSection",
};

export default function ThisMonthPage() {
  const { t, money, locale } = useLanguage();
  const { can } = useSession();
  const navigate = useNavigate();
  const today = new Date();
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const { bills, hasAccounts, loading, error, saving, setStatus } = useMonthBills(period.year, period.month);
  const [showNoAmount, setShowNoAmount] = useState(false);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  const canEdit = can("bills");
  const monthName = formatMonthName(period.month, period.year, locale);
  const summary = summarizeMonth(bills);
  const sections = groupByState(bills);

  const openDetail = (b: MonthBill) =>
    navigate(`/bills?account=${b.accountId}&year=${period.year}`);

  const togglePaid = async (b: MonthBill) => {
    const ids = b.records.map((r) => r.id).filter(Boolean) as string[];
    if (!ids.length) return;
    const previous = b.records.map((r) => ({ id: r.id as string, status: String(r.status) }));
    const markingPaid = b.state !== "paid";
    try {
      await setStatus(ids, markingPaid ? "PAID" : "CONFIRMED");
      setToast({
        message: markingPaid ? t("markedPaid", { name: b.name }) : t("saved"),
        undo: async () => {
          setToast(null);
          for (const p of previous) await setStatus([p.id], p.status);
        },
      });
    } catch {
      setToast({ message: t("genericError") });
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("thisMonthTitle", { month: monthName })}
        subtitle={t("thisMonthSubtitle")}
        actions={
          <MonthSwitcher
            year={period.year}
            month={period.month}
            onChange={(year, month) => setPeriod({ year, month })}
          />
        }
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{t("genericError")}</Alert>}

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </Stack>
      ) : !hasAccounts ? (
        <Paper>
          <EmptyState
            title={t("emptyAccounts")}
            action={
              can("accounts") && (
                <Button variant="contained" startIcon={<AddRounded />} onClick={() => navigate("/accounts")}>
                  {t("addAccount")}
                </Button>
              )
            }
          />
        </Paper>
      ) : (
        <>
          <SummaryCard summary={summary} monthName={monthName} />

          {summary.billCount === 0 && (
            <Paper sx={{ mb: 3 }}>
              <EmptyState
                title={t("emptyMonth", { month: monthName })}
                action={
                  canEdit && (
                    <Button variant="contained" onClick={() => navigate("/bills")}>
                      {t("emptyMonthAction")}
                    </Button>
                  )
                }
              />
            </Paper>
          )}

          {sections.map((section) =>
            section.state === "noAmount" && !showNoAmount ? (
              <Button key="noAmount" onClick={() => setShowNoAmount(true)} sx={{ mb: 3 }}>
                {t("showNoAmount", { n: section.bills.length })}
              </Button>
            ) : (
            <Box key={section.state} component="section" sx={{ mb: 3 }} aria-labelledby={`sec-${section.state}`}>
              <Typography
                id={`sec-${section.state}`}
                variant="subtitle2"
                component="h2"
                sx={{ mb: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                {t(SECTION_LABEL[section.state])} · {section.bills.length}
              </Typography>
              <Stack spacing={1}>
                {section.bills.map((b) => (
                  <BillRow
                    key={b.accountId}
                    bill={b}
                    money={money}
                    locale={locale}
                    canEdit={canEdit}
                    busy={saving}
                    onOpen={() => openDetail(b)}
                    onTogglePaid={() => togglePaid(b)}
                  />
                ))}
              </Stack>
            </Box>
            )
          )}
        </>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast?.message}
        action={
          toast?.undo && (
            <Button color="inherit" size="small" onClick={toast.undo}>
              {t("undo")}
            </Button>
          )
        }
      />
    </Box>
  );
}

function SummaryCard({ summary, monthName }: { summary: ReturnType<typeof summarizeMonth>; monthName: string }) {
  const { t, money } = useLanguage();
  const progress = summary.billCount ? (summary.paidCount / summary.billCount) * 100 : 0;

  if (summary.allPaid) {
    return (
      <Paper sx={{ mb: 3, p: 3, position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", inset: "0 0 auto 0", height: 6, background: brand.gradient }} />
        <Stack direction="row" spacing={2} alignItems="center">
          <BrandIcon size={64} title="" />
          <Box>
            <Typography variant="h6" component="p">
              {t("allPaid", { month: monthName })}
            </Typography>
            <Typography color="text.secondary" sx={amountSx}>
              {t("totalMonth")}: {money(summary.total)}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  const stats = [
    { label: t("toPay"), value: summary.toPay, strong: true },
    { label: t("alreadyPaid"), value: summary.paid },
    { label: t("totalMonth"), value: summary.total },
  ];

  return (
    <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {stats.map((s, i) => (
          <Box key={s.label} sx={i === 0 ? { gridColumn: { xs: "1 / -1", sm: "auto" } } : undefined}>
            <Typography variant="subtitle2">{s.label}</Typography>
            <Typography
              sx={{
                ...amountSx,
                fontWeight: 700,
                fontSize: s.strong ? { xs: 32, sm: 36 } : 20,
                lineHeight: 1.2,
              }}
            >
              {money(s.value)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 2 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          color="success"
          sx={{ height: 8 }}
          aria-label={t("paidProgress", { paid: summary.paidCount, total: summary.billCount })}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          {t("paidProgress", { paid: summary.paidCount, total: summary.billCount })}
        </Typography>
      </Box>
    </Paper>
  );
}

function BillRow({
  bill,
  money,
  locale,
  canEdit,
  busy,
  onOpen,
  onTogglePaid,
}: {
  bill: MonthBill;
  money: (v: number) => string;
  locale: string;
  canEdit: boolean;
  busy: boolean;
  onOpen: () => void;
  onTogglePaid: () => void;
}) {
  const { t } = useLanguage();
  const showToggle = canEdit && bill.records.length > 0;
  const paid = bill.state === "paid";
  const chip = (
    <StatusChip
      state={bill.state}
      daysUntilDue={bill.daysUntilDue}
      dueDate={bill.dueDate}
      recordStatus={bill.recordStatus}
    />
  );

  return (
    <Paper sx={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
      <ButtonBase
        onClick={onOpen}
        aria-label={t("viewDetail", { name: bill.name })}
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: { xs: 1.5, sm: 2 },
          p: { xs: 1.5, sm: 2 },
          textAlign: "left",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <CategoryTile name={bill.name} groupName={bill.groupName} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
            {bill.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="p">
            {[bill.groupName, bill.dueDate && formatShortDate(bill.dueDate, locale)].filter(Boolean).join(" · ")}
          </Typography>
          <Box sx={{ display: { xs: "block", sm: "none" }, mt: 0.75 }}>{chip}</Box>
        </Box>
        <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
          {bill.state !== "noAmount" && (
            <Typography sx={{ ...amountSx, fontWeight: 600, fontSize: 17 }}>{money(bill.amount)}</Typography>
          )}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>{chip}</Box>
        </Stack>
      </ButtonBase>
      {showToggle && (
        <Box sx={{ pr: 2, display: { xs: "none", sm: "block" } }}>
          <Button
            size="small"
            variant={paid ? "text" : "outlined"}
            startIcon={paid ? undefined : <CheckRounded />}
            disabled={busy}
            onClick={onTogglePaid}
            aria-label={t(paid ? "unmarkPaidAria" : "markPaidAria", { name: bill.name })}
            sx={{ minHeight: 40, whiteSpace: "nowrap" }}
          >
            {paid ? t("unmarkPaid") : t("markPaid")}
          </Button>
        </Box>
      )}
      {showToggle && !paid && (
        <Box sx={{ pr: 1, display: { xs: "block", sm: "none" } }}>
          <Button
            size="small"
            disabled={busy}
            onClick={onTogglePaid}
            aria-label={t("markPaidAria", { name: bill.name })}
            sx={{ minWidth: 48, minHeight: 48, px: 1 }}
          >
            <CheckRounded />
          </Button>
        </Box>
      )}
    </Paper>
  );
}
