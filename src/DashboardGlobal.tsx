import { gql, useQuery } from "@apollo/client";
import { useLanguage } from "./i18n";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Skeleton,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from "@mui/material";
import { useMemo, useState } from "react";
import { formatCurrency } from "./utils/format";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

/* =========================
   QUERY COMPLETA RESTAURADA
========================= */

const GET_DASHBOARD = gql`
  query {
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

/* =========================
   UTILIDAD VENTANA 5 MESES
========================= */

function getFiveMonthWindow(locale: string) {
  const today = new Date();
  const months: {
    year: number;
    month: number;
    label: string;
    key: string;
  }[] = [];

  for (let i = -2; i <= 2; i++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth() + i,
      1
    );

    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.toLocaleString(locale, {
        month: "short",
      })} ${d.getFullYear()}`,
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
    });
  }

  return months;
}

/* =========================
   DASHBOARD RESTAURADO
========================= */

export default function DashboardGlobal() {
  const { locale } = useLanguage();
  const { data, loading } = useQuery(GET_DASHBOARD, {
    fetchPolicy: "network-only",
  });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data: incomeData } = useQuery(GET_INCOME_SUMMARY, {
    variables: { year, month },
    fetchPolicy: "network-only",
  });

  const monthWindow = getFiveMonthWindow(locale);
  const currentMonth = monthWindow[2];

  const [openGroups, setOpenGroups] = useState<
    Record<string, boolean>
  >({});

  // ✅ Estado para tooltip interactivo del gráfico
  const [selectedProjection, setSelectedProjection] = useState<any>(null);

  // ✅ Control visibilidad líneas (leyenda interactiva)
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showSavings, setShowSavings] = useState(true);

  // ✅ Tooltip hover premium
  const [hoverPoint, setHoverPoint] = useState<any>(null);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const baseIncome = Number(
    incomeData?.householdIncomeSummary || 0
  );

  // ✅ Retiros de ahorro del mes actual se suman a ingresos
  const withdrawalsCurrentMonth = useMemo(() => {
    let total = 0;

    data?.savingsMovements?.forEach((m: any) => {
      if (
        m.year === currentMonth.year &&
        m.month === currentMonth.month &&
        m.type === "WITHDRAW"
      ) {
        total += Number(m.amount) || 0;
      }
    });

    return total;
  }, [data, currentMonth]);

  const currentIncome = baseIncome + withdrawalsCurrentMonth;

  /* =========================
     AGRUPACIÓN COMPLETA
  ========================= */

  const {
    grouped,
    groupTotals,
    globalTotals,
  } = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const groupTotals: Record<
      string,
      Record<string, number>
    > = {};
    const globalTotals: Record<string, number> = {};

    monthWindow.forEach((m) => {
      globalTotals[m.key] = 0;
    });

    data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
      const amountMap: Record<string, number> = {};

      // ✅ NUEVA LÓGICA CORRECTA
      // El backend ya crea nuevos registros cuando se posterga.
      // Por lo tanto:
      // - Solo mostramos en cada mes los registros que NO estén postergados.
      // - Los postergados aparecerán como nuevos registros en el mes siguiente.
      // - No hacemos arrastres manuales.
      
      monthWindow.forEach((m) => {
        const monthRecords = acc.amounts.filter(
          (a: any) =>
            a.year === m.year &&
            a.month === m.month
        );

        if (!monthRecords.length) {
          amountMap[m.key] = 0;
          return;
        }

        // ✅ Regla nueva:
        // Si un registro fue trasladado a un mes posterior
        // (existe mismo monto en un mes mayor),
        // el original no debe mostrarse.
        const total = monthRecords
          .filter((r: any) => !r.isDeferred)
          .reduce(
            (sum: number, r: any) =>
              sum + (Number(r.amount) || 0),
            0
          );

        amountMap[m.key] = total;
      });

      const groupName =
        acc.group?.name || "Sin Grupo";

      if (!grouped[groupName]) {
        grouped[groupName] = [];
        groupTotals[groupName] = {};
        monthWindow.forEach((m) => {
          groupTotals[groupName][m.key] = 0;
        });
      }

      grouped[groupName].push({
        ...acc,
        amountMap,
      });

      monthWindow.forEach((m) => {
        const value =
          amountMap[m.key] || 0;
        groupTotals[groupName][m.key] += value;
        globalTotals[m.key] += value;
      });
    });

    return { grouped, groupTotals, globalTotals };
  }, [data, monthWindow]);

  // ✅ INDICADORES DEL MES ACTUAL
  const { gastoMensualReal, totalPagadoMes, totalPendienteMes } = useMemo(() => {
    let gastoReal = 0;
    let pagado = 0;
    let pendiente = 0;

    data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
      acc.amounts.forEach((a: any) => {
        if (
          a.year === currentMonth.year &&
          a.month === currentMonth.month
        ) {
          const amount = Number(a.amount) || 0;

          const base = Number(a.base_amount || 0);
          const carried = Number(a.carried_amount || 0);
          const total = base + carried;

          // ✅ GASTO REAL del mes = SOLO base_amount
          gastoReal += base;

          // ✅ PAGADO (afecta total visible)
          if (a.status === "PAID") {
            pagado += total;
          }

          // ✅ PENDIENTE = total no pagado
          if (a.status !== "PAID") {
            pendiente += total;
          }
        }
      });
    });

    return {
      gastoMensualReal: gastoReal,
      totalPagadoMes: pagado,
      totalPendienteMes: pendiente,
    };
  }, [data, currentMonth]);

  const currentDebt = gastoMensualReal;

  const savingsTotal = Number(
    data?.savingsTotal || 0
  );

  // ✅ Ahorro REAL solo hasta el periodo actual (no incluye futuro)
  const realSavingsToDate = useMemo(() => {
    let total = 0;

    const currentKey = year * 100 + month;

    data?.savingsMovements?.forEach((m: any) => {
      const movementKey = m.year * 100 + m.month;
      const amount = Number(m.amount) || 0;

      if (movementKey <= currentKey) {
        if (m.type === "DEPOSIT") total += amount;
        if (m.type === "WITHDRAW") total -= amount;
      }
    });

    return Math.max(total, 0);
  }, [data, year, month]);

  const savingsGoal = Number(
    data?.me?.household?.savingsGoal || 0
  );

  const netResult =
    currentIncome - currentDebt;

  const savingsProgress =
    savingsGoal > 0
      ? Math.min(
          (realSavingsToDate / savingsGoal) * 100,
          100
        )
      : 0;

  /* =========================
     ✅ PROYECCIÓN 12 MESES (SECCIÓN ADICIONAL)
  ========================= */

  const projection = useMemo(() => {
    const months: any[] = [];

    // ✅ Calcular ahorro base SOLO hasta el mes anterior al actual
    let runningSavings = 0;

    const currentDateKey = year * 100 + month;

    data?.savingsMovements?.forEach((s: any) => {
      const movementKey = s.year * 100 + s.month;
      const amount = Number(s.amount) || 0;

      if (movementKey < currentDateKey) {
        if (s.type === "DEPOSIT") runningSavings += amount;
        if (s.type === "WITHDRAW") runningSavings -= amount;
      }
    });

    runningSavings = Math.max(runningSavings, 0);

    for (let i = 0; i <= 12; i++) {
      const d = new Date(year, month - 1 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      let projectedExpense = 0;
      data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
        acc.amounts.forEach((a: any) => {
          if (a.year === y && a.month === m) {
            // ✅ Proyección usa total real (base + arrastre)
            const total =
              Number(a.base_amount || 0) +
              Number(a.carried_amount || 0);
            projectedExpense += total;
          }
        });
      });

      let movement = 0;
      let withdrawalIncome = 0;

      data?.savingsMovements?.forEach((s: any) => {
        if (s.year === y && s.month === m) {
          const amount = Number(s.amount) || 0;
          if (s.type === "DEPOSIT") movement += amount;
          if (s.type === "WITHDRAW") {
            movement -= amount;
            withdrawalIncome += amount;
          }
        }
      });

      runningSavings = Math.max(runningSavings + movement, 0);

      const projectedIncomeFromDB =
        data?.householdIncomes
          ?.filter(
            (inc: any) =>
              inc.year === y &&
              inc.month === m
          )
          .reduce(
            (sum: number, inc: any) =>
              sum + (Number(inc.amount) || 0),
            0
          ) || 0;

      months.push({
        label: d.toLocaleDateString(locale, {
          month: "short",
          year: "2-digit",
        }),
        income:
          projectedIncomeFromDB +
          withdrawalIncome,
        expense: projectedExpense,
        savings: runningSavings,
      });
    }

    return months;
  }, [data, year, month, locale]);

  const projectionMax = Math.max(
    ...projection.map((p) =>
      Math.max(p.income, p.expense, p.savings)
    ),
    1
  );

  const riskPercentage =
    currentIncome > 0
      ? Math.min(
          (currentDebt / currentIncome) * 100,
          150
        )
      : 0;

  const riskColor =
    riskPercentage <= 70
      ? "success"
      : riskPercentage <= 100
      ? "warning"
      : "error";

  /* =========================
     ✅ PROYECCIÓN POR GRUPO (HOOK CORRECTO)
  ========================= */

  const groupProjection = useMemo(() => {
    const months: any[] = [];
    const groupNames = Object.keys(grouped);

    for (let i = 0; i <= 12; i++) {
      const d = new Date(year, month - 1 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      const monthData: any = {
        label: d.toLocaleDateString(locale, {
          month: "short",
          year: "2-digit",
        }),
        groups: {},
      };

      groupNames.forEach((g) => {
        monthData.groups[g] = 0;
      });

      data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
        const groupName =
          acc.group?.name || "Sin Grupo";

        acc.amounts.forEach((a: any) => {
          if (a.year === y && a.month === m) {
            monthData.groups[groupName] +=
              Number(a.amount) || 0;
          }
        });
      });

      months.push(monthData);
    }

    return months;
  }, [data, grouped, year, month, locale]);

  const groupProjectionMax = Math.max(
    ...groupProjection.flatMap((m: any) =>
      Object.values(m.groups).map(
        (v: any) => Number(v) || 0
      )
    ),
    1
  );

  /* =========================
     ✅ NUEVO: TENDENCIA SALDO NETO (Ingreso - Gasto - Ahorro)
  ========================= */

  const balanceTrend = useMemo(() => {
    const months: any[] = [];

    for (let i = 0; i <= 12; i++) {
      const d = new Date(year, month - 1 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      let income = 0;
      let expense = 0;
      let savingsDeposit = 0;
      let withdrawalIncome = 0;

      data?.householdIncomes?.forEach((inc: any) => {
        if (inc.year === y && inc.month === m) {
          income += Number(inc.amount) || 0;
        }
      });

      data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
        acc.amounts.forEach((a: any) => {
          if (a.year === y && a.month === m) {
            const total =
              Number(a.base_amount || 0) +
              Number(a.carried_amount || 0);
            expense += total;
          }
        });
      });

      data?.savingsMovements?.forEach((s: any) => {
        if (s.year === y && s.month === m) {
          const amount = Number(s.amount) || 0;
          if (s.type === "DEPOSIT") savingsDeposit += amount;
          if (s.type === "WITHDRAW") withdrawalIncome += amount;
        }
      });

      const totalIncome = income + withdrawalIncome;

      // ✅ El ahorro es gasto real del mes
      const totalExpense = expense + savingsDeposit;

      const balance = totalIncome - totalExpense;

      const percentage =
        totalIncome > 0
          ? (balance / totalIncome) * 100
          : 0;

      months.push({
        label: d.toLocaleDateString(locale, {
          month: "short",
          year: "2-digit",
        }),
        income: totalIncome,
        expense: totalExpense,
        savingsDeposit,
        balance,
        percentage,
      });
    }

    return months;
  }, [data, year, month, locale]);

  const balanceMax = Math.max(
    ...balanceTrend.map((m) =>
      Math.max(Math.abs(m.balance), m.income, m.expense)
    ),
    1
  );

  // ✅ Promedio móvil simple (3 meses)
  const movingAverage = balanceTrend.map((_, i, arr) => {
    const slice = arr.slice(Math.max(0, i - 2), i + 1);
    const avg =
      slice.reduce((sum, v) => sum + v.balance, 0) /
      slice.length;
    return avg;
  });

  // ✅ Detectar cruce bajo cero
  const zeroCrossIndexes = balanceTrend
    .map((p, i, arr) =>
      i > 0 &&
      ((arr[i - 1].balance >= 0 && p.balance < 0) ||
        (arr[i - 1].balance < 0 && p.balance >= 0))
        ? i
        : null
    )
    .filter((v) => v !== null);

  if (loading) {
    return (
      <Box>
        <Skeleton height={120} />
        <Skeleton height={400} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Dashboard Financiero
      </Typography>

      {/* KPIs COMPLETOS RESTAURADOS */}
      <Box
        display="flex"
        gap={3}
        flexWrap="wrap"
        mb={4}
      >
        {[
          { label: "Ingresos", value: currentIncome },
          { label: "Gasto Mensual Real", value: gastoMensualReal },
          { label: "Total Pagado Mes", value: totalPagadoMes },
          { label: "Total Pendiente Mes", value: totalPendienteMes },
          {
            label: "Resultado Neto",
            value: netResult,
          },
          {
            label: "Ahorro Acumulado",
            value: realSavingsToDate,
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{ flex: "1 1 250px" }}
          >
            <CardContent>
              <Typography variant="subtitle2">
                {item.label}
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
              >
                ${formatCurrency(item.value)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* RIESGO */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Riesgo de Sobregasto
        </Typography>

        <LinearProgress
          variant="determinate"
          value={Math.min(
            riskPercentage,
            100
          )}
          color={riskColor as any}
          sx={{
            height: 12,
            borderRadius: 6,
          }}
        />

        <Typography mt={2}>
          {riskPercentage.toFixed(1)}%
          del ingreso usado
        </Typography>
      </Paper>

      {/* META AHORRO RESTAURADA */}
      {savingsGoal > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6">
            Meta de Ahorro
          </Typography>

          <Typography mt={1}>
            ${formatCurrency(savingsTotal)} de $
            {formatCurrency(savingsGoal)}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={savingsProgress}
            sx={{
              height: 10,
              borderRadius: 5,
              mt: 2,
            }}
          />
        </Paper>
      )}

      {/* ✅ PROYECCIÓN FINANCIERA */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Proyección 12 Meses
        </Typography>

        {/* ✅ Leyenda interactiva */}
        <Box display="flex" gap={3} mb={2}>
          <Typography
            variant="caption"
            sx={{ cursor: "pointer", opacity: showIncome ? 1 : 0.4 }}
            onClick={() => setShowIncome(!showIncome)}
            color="#1976d2"
          >
            ━ Ingreso
          </Typography>

          <Typography
            variant="caption"
            sx={{ cursor: "pointer", opacity: showExpense ? 1 : 0.4 }}
            onClick={() => setShowExpense(!showExpense)}
            color="#ef5350"
          >
            ━ Gasto
          </Typography>

          <Typography
            variant="caption"
            sx={{ cursor: "pointer", opacity: showSavings ? 1 : 0.4 }}
            onClick={() => setShowSavings(!showSavings)}
            color="#2e7d32"
          >
            ━ Ahorro
          </Typography>
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <svg width={projection.length * 90} height={320}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1976d2" />
                <stop offset="100%" stopColor="#42a5f5" />
              </linearGradient>

              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c62828" />
                <stop offset="100%" stopColor="#ef5350" />
              </linearGradient>

              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e7d32" />
                <stop offset="100%" stopColor="#66bb6a" />
              </linearGradient>
            </defs>

            {/* ✅ Grid horizontal mejorado */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = 240 - 200 * ratio;
              return (
                <g key={i}>
                  <line
                    x1="20"
                    x2={projection.length * 90}
                    y1={y}
                    y2={y}
                    stroke={ratio === 0 ? "#9e9e9e" : "#eeeeee"}
                    strokeDasharray={ratio === 0 ? "4" : "2"}
                  />
                  <text
                    x="0"
                    y={y + 4}
                    fontSize="10"
                  >
                    {formatCurrency(projectionMax * ratio)}
                  </text>
                </g>
              );
            })}
            {/* ✅ Área sombreada Ingreso vs Gasto */}
            <polygon
              fill="rgba(25,118,210,0.08)"
              points={
                projection
                  .map((p, i) => {
                    const x = i * 90 + 40;
                    const y =
                      240 -
                      (p.income / projectionMax) * 200;
                    return `${x},${y}`;
                  })
                  .join(" ") +
                " " +
                projection
                  .slice()
                  .reverse()
                  .map((p, i) => {
                    const x =
                      (projection.length - 1 - i) *
                        90 +
                      40;
                    const y =
                      240 -
                      (p.expense / projectionMax) *
                        200;
                    return `${x},${y}`;
                  })
                  .join(" ")
              }
            />

            {/* ✅ Ingreso */}
            {showIncome && (
              <>
                <polygon
                  fill="url(#incomeGradient)"
                  opacity="0.08"
                  points={
                    projection
                      .map((p, i) => {
                        const x = i * 90 + 40;
                        const y =
                          240 -
                          (p.income / projectionMax) *
                            200;
                        return `${x},${y}`;
                      })
                      .join(" ") +
                    ` ${projection
                      .map((_, i) => `${i * 90 + 40},240`)
                      .reverse()
                      .join(" ")}`
                  }
                />

                <polyline
                  fill="none"
                  stroke="url(#incomeGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={projection
                    .map((p, i) => {
                      const x = i * 90 + 40;
                      const y =
                        240 -
                        (p.income / projectionMax) *
                          200;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </>
            )}

            {/* ✅ Gasto */}
            {showExpense && (
              <>
                <polygon
                  fill="url(#expenseGradient)"
                  opacity="0.08"
                  points={
                    projection
                      .map((p, i) => {
                        const x = i * 90 + 40;
                        const y =
                          240 -
                          (p.expense / projectionMax) *
                            200;
                        return `${x},${y}`;
                      })
                      .join(" ") +
                    ` ${projection
                      .map((_, i) => `${i * 90 + 40},240`)
                      .reverse()
                      .join(" ")}`
                  }
                />

                <polyline
                  fill="none"
                  stroke="url(#expenseGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={projection
                    .map((p, i) => {
                      const x = i * 90 + 40;
                      const y =
                        240 -
                        (p.expense / projectionMax) *
                          200;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </>
            )}

            {/* ✅ Ahorro */}
            {showSavings && (
              <>
                <polygon
                  fill="url(#savingsGradient)"
                  opacity="0.08"
                  points={
                    projection
                      .map((p, i) => {
                        const x = i * 90 + 40;
                        const y =
                          240 -
                          (p.savings / projectionMax) *
                            200;
                        return `${x},${y}`;
                      })
                      .join(" ") +
                    ` ${projection
                      .map((_, i) => `${i * 90 + 40},240`)
                      .reverse()
                      .join(" ")}`
                  }
                />

                <polyline
                  fill="none"
                  stroke="url(#savingsGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={projection
                    .map((p, i) => {
                      const x = i * 90 + 40;
                      const y =
                        240 -
                        (p.savings / projectionMax) *
                          200;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </>
            )}

            {/* ✅ Línea vertical mes actual */}
            <line
              x1={2 * 90 + 40}
              x2={2 * 90 + 40}
              y1="40"
              y2="240"
              stroke="#9e9e9e"
              strokeDasharray="4"
            />

            {/* ✅ Puntos interactivos reales */}
            {projection.map((p, i) => {
              const x = i * 90 + 40;

              const incomeY =
                240 - (p.income / projectionMax) * 200;
              const expenseY =
                240 - (p.expense / projectionMax) * 200;
              const savingsY =
                240 - (p.savings / projectionMax) * 200;

              return (
                <g key={i}>
                  {showIncome && (
                    <circle
                      cx={x}
                      cy={incomeY}
                      r="6"
                      fill="#1976d2"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoverPoint(p)}
                      onMouseLeave={() => setHoverPoint(null)}
                      onClick={() =>
                        setSelectedProjection(p)
                      }
                    />
                  )}
                  <circle
                    cx={x}
                    cy={expenseY}
                    r="6"
                    fill={
                      p.expense > p.income
                        ? "#b71c1c"
                        : "#ef5350"
                    }
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSelectedProjection(p)
                    }
                  />
                  <circle
                    cx={x}
                    cy={savingsY}
                    r="6"
                    fill="#2e7d32"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSelectedProjection(p)
                    }
                  />

                  <text
                    x={x}
                    y={270}
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>

        {/* ✅ Tooltip flotante hover premium */}
        {hoverPoint && (
          <Box
            sx={{
              position: "absolute",
              background: "white",
              border: "1px solid #e0e0e0",
              p: 1,
              borderRadius: 1,
              boxShadow: 3,
            }}
          >
            <Typography variant="caption">
              {hoverPoint.label}
            </Typography>
          </Box>
        )}

        {/* ✅ Panel detalle interactivo */}
        {selectedProjection && (
          <Paper
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "#fafafa",
              border: "1px solid #e0e0e0",
            }}
          >
            <Typography fontWeight={600}>
              {selectedProjection.label}
            </Typography>

            <Typography color="#1976d2">
              Ingreso: $
              {formatCurrency(
                selectedProjection.income
              )}
            </Typography>

            <Typography color="#ef5350">
              Gasto: $
              {formatCurrency(
                selectedProjection.expense
              )}
            </Typography>

            <Typography color="#2e7d32">
              Ahorro: $
              {formatCurrency(
                selectedProjection.savings
              )}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                cursor: "pointer",
                display: "block",
                mt: 1,
              }}
              onClick={() =>
                setSelectedProjection(null)
              }
            >
              Cerrar
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* ✅ NUEVO: PROYECCIÓN POR GRUPOS (LINEAL + CLICK POR PERIODO) */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Proyección por Grupo (12 Meses)
        </Typography>

        <Box sx={{ overflowX: "auto" }}>
          <svg
            width={groupProjection.length * 90}
            height={320}
          >
            <defs>
              <linearGradient id="groupGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3949ab" />
                <stop offset="100%" stopColor="#9fa8da" />
              </linearGradient>
            </defs>
            {/* Líneas por grupo */}
            {Object.keys(grouped).map((groupName, gi) => {
              const color =
                [
                  "#1976d2",
                  "#ef5350",
                  "#2e7d32",
                  "#ff9800",
                  "#8e24aa",
                  "#0097a7",
                ][gi % 6];

              const points = groupProjection
                .map((monthData: any, i: number) => {
                  const x = i * 90 + 40;
                  const value =
                    monthData.groups[groupName] || 0;
                  const y =
                    240 -
                    (value / groupProjectionMax) *
                      200;
                  return `${x},${y}`;
                })
                .join(" ");

              return (
                <>
                  <polyline
                    key={groupName}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                </>
              );
            })}

            {/* Área clickable por periodo */}
            {groupProjection.map((monthData: any, i: number) => {
              const x = i * 90 + 40;

              return (
                <g key={i}>
                  <rect
                    x={x - 30}
                    y={40}
                    width={60}
                    height={200}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSelectedProjection({
                        label: monthData.label,
                        groups: monthData.groups,
                      })
                    }
                  />

                  <text
                    x={x}
                    y={270}
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {monthData.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>

        {/* ✅ Detalle conjunto por periodo */}
        {selectedProjection?.groups && (
          <Paper
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "#fafafa",
              border: "1px solid #e0e0e0",
            }}
          >
            <Typography fontWeight={600}>
              {selectedProjection.label}
            </Typography>

            {Object.entries(
              selectedProjection.groups
            ).map(([g, v]: any) => {
              const groupNames = Object.keys(grouped);
              const gi = groupNames.indexOf(g);
              const color =
                [
                  "#1976d2",
                  "#ef5350",
                  "#2e7d32",
                  "#ff9800",
                  "#8e24aa",
                  "#0097a7",
                ][gi % 6];

              return (
                <Box
                  key={g}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: color,
                    }}
                  />
                  <Typography>
                    {g}: $
                    {formatCurrency(Number(v) || 0)}
                  </Typography>
                </Box>
              );
            })}

            <Typography
              fontWeight={700}
              sx={{ mt: 1 }}
            >
              Total Gastos: $
              {formatCurrency(
                Object.values(
                  selectedProjection.groups
                ).reduce(
                  (sum: number, v: any) =>
                    sum + (Number(v) || 0),
                  0
                )
              )}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                cursor: "pointer",
                display: "block",
                mt: 1,
              }}
              onClick={() =>
                setSelectedProjection(null)
              }
            >
              Cerrar
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* ✅ NUEVO GRÁFICO: SALDO A FAVOR / EN CONTRA */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Tendencia Saldo Neto (12 Meses)
        </Typography>

        <Box sx={{ overflowX: "auto" }}>
          <svg width={balanceTrend.length * 90} height={320}>
            <defs>
              {/* ✅ Gradiente dinámico */}
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e7d32" />
                <stop offset="50%" stopColor="#6a1b9a" />
                <stop offset="100%" stopColor="#c62828" />
              </linearGradient>
            </defs>

            {/* ✅ Líneas guía horizontales */}
            {[ -1, -0.5, 0, 0.5, 1 ].map((ratio, i) => {
              const y = 140 - ratio * 120;
              return (
                <line
                  key={i}
                  x1="20"
                  x2={balanceTrend.length * 90}
                  y1={y}
                  y2={y}
                  stroke={ratio === 0 ? "#9e9e9e" : "#eeeeee"}
                  strokeDasharray={ratio === 0 ? "4" : "2"}
                />
              );
            })}

            {/* ✅ Área sombreada */}
            <polygon
              fill="rgba(106,27,154,0.08)"
              points={
                balanceTrend
                  .map((p, i) => {
                    const x = i * 90 + 40;
                    const y =
                      140 -
                      (p.balance / balanceMax) * 120;
                    return `${x},${y}`;
                  })
                  .join(" ") +
                ` ${balanceTrend
                  .map((_, i) => `${i * 90 + 40},140`)
                  .reverse()
                  .join(" ")}`
              }
            />

            {/* ✅ Línea principal animada */}
            <polyline
              fill="none"
              stroke="url(#balanceGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 1000,
                strokeDashoffset: 0,
                animation: "dash 1.5s ease-out"
              }}
              points={balanceTrend
                .map((p, i) => {
                  const x = i * 90 + 40;
                  const y =
                    140 -
                    (p.balance / balanceMax) * 120;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* ✅ Línea promedio móvil */}
            <polyline
              fill="none"
              stroke="#ff9800"
              strokeWidth="2"
              strokeDasharray="6"
              points={movingAverage
                .map((avg, i) => {
                  const x = i * 90 + 40;
                  const y =
                    140 -
                    (avg / balanceMax) * 120;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* ✅ Indicador visual cruce cero */}
            {zeroCrossIndexes.map((i) => {
              const x = i * 90 + 40;
              return (
                <line
                  key={"cross-" + i}
                  x1={x}
                  x2={x}
                  y1="20"
                  y2="260"
                  stroke="#ff1744"
                  strokeDasharray="3"
                />
              );
            })}

            {balanceTrend.map((p, i) => {
              const x = i * 90 + 40;
              const y =
                140 -
                (p.balance / balanceMax) * 120;

              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="7"
                    fill={
                      p.balance >= 0
                        ? "#2e7d32"
                        : "#c62828"
                    }
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoverPoint(p)}
                    onMouseLeave={() => setHoverPoint(null)}
                    onClick={() =>
                      setSelectedProjection(p)
                    }
                  />

                  {/* ✅ Valor visible arriba del punto */}
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#424242"
                  >
                    {formatCurrency(p.balance)}
                  </text>

                  <text
                    x={x}
                    y={270}
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>

        {hoverPoint && (
          <Box
            sx={{
              position: "absolute",
              background: "#ffffff",
              border: "1px solid #ddd",
              p: 1.5,
              borderRadius: 2,
              boxShadow: 4,
              mt: -2
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {hoverPoint.label}
            </Typography>
            <Typography fontSize={12}>
              Saldo: ${formatCurrency(hoverPoint.balance)}
            </Typography>
          </Box>
        )}

        {selectedProjection?.balance !== undefined && (
          <Paper
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "#fafafa",
              border: "1px solid #e0e0e0",
            }}
          >
            <Typography fontWeight={600}>
              {selectedProjection.label}
            </Typography>

            <Typography color="#1976d2">
              Ingresos: $
              {formatCurrency(
                selectedProjection.income
              )}
            </Typography>

            <Typography color="#ef5350">
              Gastos: $
              {formatCurrency(
                selectedProjection.expense - selectedProjection.savingsDeposit
              )}
            </Typography>

            <Typography color="#ff9800">
              Ahorro del mes: $
              {formatCurrency(
                selectedProjection.savingsDeposit
              )}
            </Typography>

            <Typography fontWeight={600}>
              Total Salidas: $
              {formatCurrency(
                selectedProjection.expense
              )}
            </Typography>

            <Typography
              color={
                selectedProjection.balance >= 0
                  ? "#2e7d32"
                  : "#c62828"
              }
            >
              Saldo: $
              {formatCurrency(
                selectedProjection.balance
              )}
            </Typography>

            <Typography variant="body2">
              Variación:{" "}
              {selectedProjection.percentage.toFixed(1)}
              %
            </Typography>

            <Typography
              variant="caption"
              sx={{
                cursor: "pointer",
                display: "block",
                mt: 1,
              }}
              onClick={() =>
                setSelectedProjection(null)
              }
            >
              Cerrar
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* TABLA COMPLETA 5 MESES RESTAURADA */}
      <Paper elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                Grupo / Cuenta
              </TableCell>
              {monthWindow.map((m) => (
                <TableCell
                  key={m.key}
                  align="right"
                >
                  {m.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {Object.entries(grouped).map(
              ([groupName, accounts]) => (
                <>
                  <TableRow
                    key={groupName}
                    sx={{
                      backgroundColor:
                        "#f5f5f5",
                    }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          toggleGroup(
                            groupName
                          )
                        }
                      >
                        {openGroups[
                          groupName
                        ] ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                      <strong>
                        {groupName}
                      </strong>
                    </TableCell>

                    {monthWindow.map((m) => (
                      <TableCell
                        key={m.key}
                        align="right"
                      >
                        <strong>
                          $
                          {formatCurrency(
                            groupTotals[
                              groupName
                            ][m.key]
                          )}
                        </strong>
                      </TableCell>
                    ))}
                  </TableRow>

                  {openGroups[
                    groupName
                  ] &&
                    accounts.map(
                      (acc: any) => (
                        <TableRow
                          key={acc.id}
                        >
                          <TableCell sx={{ pl: 4 }}>
                            {acc.name}
                          </TableCell>

                          {monthWindow.map((m) => {
                            const amount =
                              acc.amountMap[m.key] || 0;

                            const monthRecords = acc.amounts?.filter(
                              (a: any) =>
                                a.year === m.year &&
                                a.month === m.month
                            ) || [];

                            let bgColor = "inherit";

                            if (monthRecords.length > 0) {
                              const isPastMonth =
                                new Date(
                                  m.year,
                                  m.month - 1
                                ) <
                                new Date(
                                  currentMonth.year,
                                  currentMonth.month - 1
                                );

                              // ✅ Separar postergados y reales
                              const nonDeferred = monthRecords.filter(
                                (r: any) => !r.isDeferred
                              );

                              const hasDeferredOnly =
                                monthRecords.length > 0 &&
                                nonDeferred.length === 0;

                              const hasPaid =
                                nonDeferred.some(
                                  (r: any) =>
                                    r.status === "PAID"
                                );

                              const hasPending =
                                nonDeferred.some(
                                  (r: any) =>
                                    r.status !== "PAID"
                                );

                              if (hasDeferredOnly) {
                                // 🔵 Solo postergadas
                                bgColor = "#e3f2fd";
                              } else if (hasPaid) {
                                // 🟢 Pagada real del mes
                                bgColor = "#e8f5e9";
                              } else if (
                                hasPending &&
                                isPastMonth
                              ) {
                                // 🔴 Atrasada
                                bgColor = "#ffebee";
                              } else if (hasPending) {
                                // 🟠 Pendiente actual
                                bgColor = "#fff3e0";
                              }
                            }

                            return (
                              <TableCell
                                key={m.key}
                                align="right"
                                sx={{
                                  backgroundColor:
                                    bgColor,
                                }}
                              >
                                $
                                {formatCurrency(
                                  amount
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      )
                    )}
                </>
              )
            )}

            <TableRow
              sx={{
                backgroundColor:
                  "#e0e0e0",
              }}
            >
              <TableCell>
                <strong>Total Mes</strong>
              </TableCell>
              {monthWindow.map((m) => (
                <TableCell
                  key={m.key}
                  align="right"
                >
                  <strong>
                    $
                    {formatCurrency(
                      globalTotals[m.key]
                    )}
                  </strong>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
