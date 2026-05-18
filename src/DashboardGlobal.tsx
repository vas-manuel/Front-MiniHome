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
