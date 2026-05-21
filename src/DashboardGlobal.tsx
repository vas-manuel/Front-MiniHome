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

      acc.amounts.forEach((a: any) => {
        amountMap[`${a.year}-${a.month}`] =
          Number(a.amount) || 0;
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

          // ✅ GASTO REAL: suma todo excepto postergados
          if (!a.isDeferred) {
            gastoReal += amount;
          }

          // ✅ PAGADO
          if (a.status === "PAID") {
            pagado += amount;
          }

          // ✅ PENDIENTE REAL (no pagado y no postergado)
          if (a.status !== "PAID" && !a.isDeferred) {
            pendiente += amount;
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

  const savingsGoal = Number(
    data?.me?.household?.savingsGoal || 0
  );

  const netResult =
    currentIncome - currentDebt;

  const savingsProgress =
    savingsGoal > 0
      ? Math.min(
          (savingsTotal / savingsGoal) * 100,
          100
        )
      : 0;

  /* =========================
     ✅ PROYECCIÓN 12 MESES (SECCIÓN ADICIONAL)
  ========================= */

  const projection = useMemo(() => {
    const months: any[] = [];
    let runningSavings = savingsTotal;

    for (let i = 0; i <= 12; i++) {
      const d = new Date(year, month - 1 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      let projectedExpense = 0;
      data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
        acc.amounts.forEach((a: any) => {
          if (a.year === y && a.month === m) {
            projectedExpense += Number(a.amount) || 0;
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

      const projectedSavings = Math.max(
        runningSavings + movement,
        0
      );

      runningSavings = projectedSavings;

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
        savings: projectedSavings,
      });
    }

    return months;
  }, [data, savingsTotal, currentIncome]);

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
            expense += Number(a.amount) || 0;
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
            value: savingsTotal,
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
            
            {/* ✅ EJE Y */}
            {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = 240 - 200 * ratio;
              return (
                <g key={i}>
                  <line
                    x1="20"
                    x2={projection.length * 90}
                    y1={y}
                    y2={y}
                    stroke="#eeeeee"
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
              <polyline
                fill="none"
                stroke="#1976d2"
                strokeWidth="3"
                style={{ transition: "all 0.6s ease" }}
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
            )}

            {/* ✅ Gasto */}
            {showExpense && (
              <polyline
                fill="none"
                stroke="#ef5350"
                strokeWidth="3"
                style={{ transition: "all 0.6s ease" }}
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
            )}

            {/* ✅ Ahorro */}
            {showSavings && (
              <polyline
                fill="none"
                stroke="#2e7d32"
                strokeWidth="3"
                style={{ transition: "all 0.6s ease" }}
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
                <polyline
                  key={groupName}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  points={points}
                />
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
            {/* Línea cero */}
            <line
              x1="20"
              x2={balanceTrend.length * 90}
              y1="140"
              y2="140"
              stroke="#9e9e9e"
              strokeDasharray="4"
            />

            {/* Línea balance */}
            <polyline
              fill="none"
              stroke="#6a1b9a"
              strokeWidth="3"
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
                    r="6"
                    fill={
                      p.balance >= 0
                        ? "#2e7d32"
                        : "#c62828"
                    }
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
              Gastos (incluye ahorro): $
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

                            const record = acc.amounts?.find(
                              (a: any) =>
                                `${a.year}-${a.month}` ===
                                m.key
                            );

                            let bgColor = "inherit";

                            if (record) {
                              const isPastMonth =
                                new Date(
                                  m.year,
                                  m.month - 1
                                ) <
                                new Date(
                                  currentMonth.year,
                                  currentMonth.month - 1
                                );

                              if (record.isDeferred) {
                                // 🔵 Postergada
                                bgColor = "#e3f2fd";
                              } else if (
                                record.status === "PAID"
                              ) {
                                // 🟢 Pagada
                                bgColor = "#e8f5e9";
                              } else if (
                                record.status !== "PAID" &&
                                isPastMonth
                              ) {
                                // 🔴 Atrasada
                                bgColor = "#ffebee";
                              } else if (
                                record.status !== "PAID"
                              ) {
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
