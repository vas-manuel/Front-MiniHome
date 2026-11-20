import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Box, Skeleton, Stack, useTheme } from "@mui/material";
import { useLanguage } from "../../i18n";
import { chartSeries, groupSeriesPalette } from "../../brand/tokens";
import { MonthSwitcher, PageHeader } from "../../components/common";
import type { Series } from "../../components/LineChart";
import {
  AnalysisData,
  balanceTrend,
  fiveMonthWindow,
  groupedTable,
  groupProjection,
  monthIndicators,
  movingAverage,
  NO_GROUP,
  projection,
  riskLevel,
  riskPercentage,
  savingsProgress,
  savingsToDate,
  withdrawalsInMonth,
} from "./analysisLogic";
import { ChartCard, DetailPanel, KpiGrid, MonthTable, ProgressCard } from "./AnalysisParts";
import { balanceWithConsumption, consumptionFor, MonthTotal, projectionWithConsumption } from "./consumptionAnalysis";
import { CONSUMPTION_BY_MONTH } from "../consumption/queries";

const GET_DASHBOARD = gql`
  query AnalysisDashboard {
    me {
      household {
        savingsGoal
      }
    }
    fixedAccountsWithAmounts {
      id
      name
      group {
        id
        name
      }
      amounts {
        year
        month
        amount
        base_amount
        carried_amount
        status
        isDeferred
      }
    }
    savingsTotal
    savingsMovements {
      year
      month
      type
      amount
    }
    householdIncomes {
      year
      month
      amount
    }
  }
`;

const GET_INCOME_SUMMARY = gql`
  query GetIncomeSummary($year: Int!, $month: Int!) {
    householdIncomeSummary(year: $year, month: $month)
  }
`;

const MAX_GROUP_SERIES = 6;

export default function AnalysisPage() {
  const { t, money, locale } = useLanguage();
  const theme = useTheme();
  const mode = theme.palette.mode;
  const colors = chartSeries(mode);
  const today = new Date();
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const { year, month } = period;
  const [selected, setSelected] = useState<{ chart: string; index: number } | null>(null);

  const { data, loading } = useQuery(GET_DASHBOARD, { fetchPolicy: "network-only" });
  const { data: incomeData } = useQuery(GET_INCOME_SUMMARY, { variables: { year, month }, fetchPolicy: "network-only" });
  // Consumo (gastos variables): 36 meses que terminan al final de la proyección
  const projectionEnd = new Date(year, month - 1 + 12, 1);
  const { data: consumptionData } = useQuery<{ consumptionByMonth: MonthTotal[] }>(CONSUMPTION_BY_MONTH, {
    variables: { year: projectionEnd.getFullYear(), month: projectionEnd.getMonth() + 1, months: 36 },
    fetchPolicy: "network-only",
  });
  const consumptionRows = useMemo(() => consumptionData?.consumptionByMonth ?? [], [consumptionData]);

  const d: AnalysisData = useMemo(
    () => ({
      accounts: data?.fixedAccountsWithAmounts ?? [],
      savingsMovements: data?.savingsMovements ?? [],
      incomes: data?.householdIncomes ?? [],
    }),
    [data]
  );

  const monthLabel = (y: number, m: number, opts: Intl.DateTimeFormatOptions) =>
    new Date(y, m - 1, 1).toLocaleDateString(locale, opts).replace(".", "");

  const window = useMemo(
    () => fiveMonthWindow(year, month).map((m) => ({ ...m, label: monthLabel(m.year, m.month, { month: "short", year: "numeric" }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, locale]
  );
  const table = useMemo(() => groupedTable(d.accounts, window), [d, window]);
  const ind = useMemo(() => monthIndicators(d.accounts, year, month), [d, year, month]);
  const proj = useMemo(() => projectionWithConsumption(projection(d, year, month), consumptionRows, today), [d, year, month, consumptionRows]);
  const groupProj = useMemo(() => groupProjection(d.accounts, year, month), [d, year, month]);
  const balance = useMemo(() => balanceWithConsumption(balanceTrend(d, year, month), consumptionRows, today), [d, year, month, consumptionRows]);
  const consumption = consumptionFor(consumptionRows, year, month, today);
  const totalExpense = ind.realExpense + consumption;

  const income = Number(incomeData?.householdIncomeSummary || 0) + withdrawalsInMonth(d.savingsMovements, year, month);
  const savings = savingsToDate(d.savingsMovements, year, month);
  const savingsGoal = Number(data?.me?.household?.savingsGoal || 0);
  const risk = riskPercentage(totalExpense, income);
  const chartLabels = proj.map((p) => monthLabel(p.year, p.month, { month: "short", year: "2-digit" }));

  // Color sigue al grupo (orden alfabético estable); más de 6 grupos se agrupan en "Otros"
  const groupSeries: Series[] = useMemo(() => {
    const palette = groupSeriesPalette(mode);
    const names = Object.keys(groupProj[0]?.groups ?? {}).sort((a, b) => a.localeCompare(b));
    const shown = names.length > MAX_GROUP_SERIES ? names.slice(0, MAX_GROUP_SERIES - 1) : names;
    const rest = names.filter((n) => !shown.includes(n));
    const list: Series[] = shown.map((g, i) => ({
      key: g,
      label: g === NO_GROUP ? t("noGroup") : g,
      color: palette[i],
      values: groupProj.map((p) => p.groups[g] || 0),
    }));
    if (consumptionRows.length) {
      list.push({
        key: "__consumo",
        label: t("legendConsumption"),
        color: colors.expense,
        dashed: true,
        values: proj.map((p) => p.consumption),
      });
    }
    if (rest.length) {
      list.push({
        key: "__otros",
        label: t("otherGroups"),
        color: palette[MAX_GROUP_SERIES - 1],
        values: groupProj.map((p) => rest.reduce((s, g) => s + (p.groups[g] || 0), 0)),
      });
    }
    return list;
  }, [groupProj, mode, t, proj, consumptionRows, colors.expense]);

  const select = (chart: string) => (index: number) => setSelected({ chart, index });
  const sel = (chart: string) => (selected?.chart === chart ? selected.index : null);
  const close = () => setSelected(null);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  const pIdx = sel("projection");
  const gIdx = sel("groups");
  const bIdx = sel("balance");

  return (
    <Box>
      <PageHeader
        title={t("analysisTitle")}
        subtitle={t("analysisSubtitle")}
        actions={<MonthSwitcher year={year} month={month} maxMonthsAhead={12} onChange={(y, m) => { setPeriod({ year: y, month: m }); close(); }} />}
      />

      <KpiGrid
        items={[
          { label: t("kpiIncome"), value: income },
          { label: t("kpiFixedBills"), value: ind.realExpense },
          { label: t("kpiConsumption"), value: consumption },
          { label: t("kpiRealExpense"), value: totalExpense },
          { label: t("kpiPaid"), value: ind.paid },
          { label: t("kpiPending"), value: ind.pending },
          { label: t("kpiNet"), value: income - totalExpense },
          { label: t("kpiSavings"), value: savings },
        ]}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: savingsGoal > 0 ? "1fr 1fr" : "1fr" }, gap: 2, mb: 3 }}>
        <ProgressCard title={t("riskTitle")} value={risk} color={riskLevel(risk)} caption={t("riskText", { pct: risk.toFixed(1) })} />
        {savingsGoal > 0 && (
          <ProgressCard
            title={t("savingsGoalTitle")}
            value={savingsProgress(savings, savingsGoal)}
            color="primary"
            caption={t("savingsGoalText", { current: money(Number(data?.savingsTotal || 0)), goal: money(savingsGoal) })}
          />
        )}
      </Box>

      <ChartCard
        title={t("projectionTitle")}
        labels={chartLabels}
        markerIndex={0}
        series={[
          { key: "income", label: t("legendIncome"), color: colors.income, values: proj.map((p) => p.income) },
          { key: "expense", label: t("legendExpense"), color: colors.expense, values: proj.map((p) => p.expense) },
          { key: "savings", label: t("legendSavings"), color: colors.savings, values: proj.map((p) => p.savings) },
        ]}
        onSelect={select("projection")}
        selectedIndex={pIdx}
        detail={
          pIdx !== null && (
            <DetailPanel
              title={chartLabels[pIdx]}
              onClose={close}
              rows={[
                { label: t("income"), value: money(proj[pIdx].income) },
                { label: t("expenses"), value: money(proj[pIdx].expense) },
                { label: t("legendConsumption"), value: money(proj[pIdx].consumption) },
                { label: t("legendSavings"), value: money(proj[pIdx].savings) },
              ]}
            />
          )
        }
      />

      <ChartCard
        title={t("groupProjectionTitle")}
        labels={chartLabels}
        markerIndex={0}
        series={groupSeries}
        onSelect={select("groups")}
        selectedIndex={gIdx}
        detail={
          gIdx !== null && (
            <DetailPanel
              title={chartLabels[gIdx]}
              onClose={close}
              rows={[
                ...groupSeries.map((s) => ({ label: s.label, value: money(s.values[gIdx]) })),
                { label: t("totalExpenses"), value: money(groupSeries.reduce((sum, s) => sum + s.values[gIdx], 0)), strong: true },
              ]}
            />
          )
        }
      />

      <ChartCard
        title={t("balanceTrendTitle")}
        labels={chartLabels}
        markerIndex={0}
        series={[
          { key: "balance", label: t("legendBalance"), color: colors.balance, values: balance.map((b) => b.balance) },
          { key: "avg", label: t("legendAverage"), color: colors.average, dashed: true, values: movingAverage(balance.map((b) => b.balance)) },
        ]}
        onSelect={select("balance")}
        selectedIndex={bIdx}
        detail={
          bIdx !== null && (
            <DetailPanel
              title={chartLabels[bIdx]}
              onClose={close}
              rows={[
                { label: t("income"), value: money(balance[bIdx].income) },
                { label: t("expenses"), value: money(balance[bIdx].expense - balance[bIdx].savingsDeposit) },
                { label: t("legendConsumption"), value: money(balance[bIdx].consumption) },
                { label: t("savingsOfMonth"), value: money(balance[bIdx].savingsDeposit) },
                { label: t("totalOutflows"), value: money(balance[bIdx].expense) },
                { label: t("balance"), value: money(balance[bIdx].balance), strong: true },
                { label: t("variation", { pct: balance[bIdx].percentage.toFixed(1) }), value: "" },
              ]}
            />
          )
        }
      />

      <MonthTable
        window={window}
        grouped={table.grouped}
        groupTotals={table.groupTotals}
        globalTotals={table.globalTotals}
        current={{ year, month }}
      />
    </Box>
  );
}
