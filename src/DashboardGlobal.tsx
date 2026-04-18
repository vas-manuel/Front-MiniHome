import { gql, useQuery, useLazyQuery } from "@apollo/client";
import { useLanguage } from "./i18n";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  IconButton,
  Paper,
  Card,
  CardContent,
  Skeleton,
} from "@mui/material";
import { useState, useMemo } from "react";
import { formatCurrency } from "./utils/format";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const GET_FIXED_DASHBOARD = gql`
  query {
    me {
      id
      household {
        id
        subscriptionStatus
        subscriptionEndsAt
        plan {
          id
          name
          maxUsers
          maxBillAccounts
          maxHistoryMonths
          priceMonthly
        }
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
  }
`;

function getFiveMonthWindow(locale: string) {
  const today = new Date();
  const months: { year: number; month: number; label: string; key: string }[] = [];

  for (let i = -2; i <= 2; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    months.push({
      year,
      month,
      label: `${d.toLocaleString(locale, { month: "short" })} ${year}`,
      key: `${year}-${month}`,
    });
  }

  return months;
}

import { Button, TextField, MenuItem } from "@mui/material";

const EXPORT_REPORT = gql`
  query ExportAnnualReport($type: BillAccountType!, $year: Int!) {
    exportAnnualReport(type: $type, year: $year)
  }
`;

export default function DashboardGlobal() {
  const { t, locale } = useLanguage();
  const [exportReport] = useLazyQuery(EXPORT_REPORT);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleExport = async () => {
    try {
      setExporting(true);

      const { data } = await exportReport({
        variables: { type: "FIXED", year: selectedYear },
      });

      if (data?.exportAnnualReport) {
        const link = document.createElement("a");
        link.href = data.exportAnnualReport;
        link.download = `reporte_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setExporting(false);
    }
  };
  const { data, loading } = useQuery(GET_FIXED_DASHBOARD);

  const household = data?.me?.household;
  const plan = household?.plan;

  const daysLeft = household?.subscriptionEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(household.subscriptionEndsAt).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;
  const monthWindow = getFiveMonthWindow(locale);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const {
    grouped,
    ungrouped,
    groupTotals,
    globalTotals,
    paidTotals,
    pendingTotals,
    realDebtTotals,
  } = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const ungrouped: any[] = [];
    const groupTotals: Record<string, Record<string, number>> = {};
    const globalTotals: Record<string, number> = {};
    const paidTotals: Record<string, number> = {};
    const pendingTotals: Record<string, number> = {};
    const realDebtTotals: Record<string, number> = {};

    monthWindow.forEach(m => {
      globalTotals[m.key] = 0;
      paidTotals[m.key] = 0;
      pendingTotals[m.key] = 0;
      realDebtTotals[m.key] = 0;
    });

    data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
      const amountMap: Record<
        string,
        { amount: number; status: string; isDeferred?: boolean }
      > = {};

      acc.amounts.forEach((a: any) => {
        amountMap[`${a.year}-${a.month}`] = {
          amount: a.amount,
          status: a.status,
          isDeferred: a.isDeferred,
        };
      });

      const processMonth = (m: any, index: number) => {
        const record = amountMap[m.key];
        const value = record?.amount || 0;

        globalTotals[m.key] += value;

        if (record?.status === "PAID") {
          paidTotals[m.key] += value;
        } else {
          // ✅ Pendiente sigue contando en el mes original
          pendingTotals[m.key] += value;

          // ✅ Si está postergada, NO suma en deuda real del mes actual
          if (record?.isDeferred) {
            if (monthWindow[index + 1]) {
              realDebtTotals[monthWindow[index + 1].key] += value;
            }
          } else {
            realDebtTotals[m.key] += value;
          }
        }

        return value;
      };

      if (acc.group) {
        if (!grouped[acc.group.name]) {
          grouped[acc.group.name] = [];
          groupTotals[acc.group.name] = {};
          monthWindow.forEach(m => {
            groupTotals[acc.group.name][m.key] = 0;
          });
        }

        grouped[acc.group.name].push({ ...acc, amountMap });

        monthWindow.forEach((m, idx) => {
          const value = processMonth(m, idx);
          groupTotals[acc.group.name][m.key] += value;
        });
      } else {
        ungrouped.push({ ...acc, amountMap });
        monthWindow.forEach((m, idx) => processMonth(m, idx));
      }
    });

    return {
      grouped,
      ungrouped,
      groupTotals,
      globalTotals,
      paidTotals,
      pendingTotals,
      realDebtTotals,
    };
  }, [data, monthWindow]);

  const currentMonth = monthWindow[2]; // mes actual (centro de la ventana)

  // ✅ NUEVA TABLA: Listado de pendientes por mes (considera postergados al mes siguiente)
  const pendingByMonth = useMemo(() => {
    const result: Record<string, any[]> = {};

    monthWindow.forEach(m => {
      result[m.key] = [];
    });

    data?.fixedAccountsWithAmounts?.forEach((acc: any) => {
      acc.amounts.forEach((a: any) => {
        const originalKey = `${a.year}-${a.month}`;

        // Solo considerar no pagados
        if (a.status !== "PAID") {
          let targetKey = originalKey;

          // ✅ Si está postergado, se mueve al mes siguiente
          if (a.isDeferred) {
            const date = new Date(a.year, a.month - 1);
            date.setMonth(date.getMonth() + 1);
            targetKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          }

          if (result[targetKey]) {
            result[targetKey].push({
              accountName: acc.name,
              groupName: acc.group?.name || "Sin Grupo",
              amount: a.amount,
            });
          }
        }
      });
    });

    return result;
  }, [data, monthWindow]);

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Año"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {availableYears.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="outlined"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exportando..." : "Exportar Reporte Anual"}
        </Button>
      </Box>
      <Typography variant="h5" mb={3} fontWeight={600}>
        {t("dashboard")} - {t("amounts")}
      </Typography>

      {loading ? (
        <Box mb={4}>
          <Skeleton height={120} sx={{ borderRadius: 2 }} />
        </Box>
      ) : plan && (
        <Box
          mb={4}
          sx={{
            p: 3,
            borderRadius: 2,
            background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
            color: "white",
          }}
        >
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            Plan Actual
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {plan.name} — ${formatCurrency(plan.priceMonthly)}/mes
          </Typography>

          <Typography variant="body2" mt={1}>
            Estado: <strong>{household.subscriptionStatus}</strong>
            {daysLeft !== null && ` · ${daysLeft} días restantes`}
          </Typography>

          <Typography variant="body2" mt={1}>
            Límites: {plan.maxUsers} usuarios · {plan.maxBillAccounts} cuentas ·{" "}
            {plan.maxHistoryMonths} meses historial
          </Typography>
        </Box>
      )}

      {/* ✅ KPI Widgets Modernos con Tendencia */}
      <Box
        mb={4}
        sx={{
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
        }}
      >
        {[
          {
            label: `Total Mes (${currentMonth.label})`,
            value: globalTotals[currentMonth.key],
            prev: globalTotals[monthWindow[1]?.key] || 0,
            color: "#f5f5f5",
          },
          {
            label: "Total Pagado",
            value: paidTotals[currentMonth.key],
            prev: paidTotals[monthWindow[1]?.key] || 0,
            color: "#e8f5e9",
          },
          {
            label: "Total Pendiente",
            value: pendingTotals[currentMonth.key],
            prev: pendingTotals[monthWindow[1]?.key] || 0,
            color: "#ffebee",
          },
          {
            label: "Deuda Real",
            value: realDebtTotals[currentMonth.key],
            prev: realDebtTotals[monthWindow[1]?.key] || 0,
            color: "#fff3e0",
          },
        ].map((kpi, index) => {
          const diff = kpi.value - kpi.prev;
          const percent =
            kpi.prev === 0 ? 0 : (diff / kpi.prev) * 100;
          const isPositive = diff >= 0;

          return (
            <Box
              key={index}
              sx={{
                flex: "1 1 250px",
                minWidth: 250,
              }}
            >
              <Card
                sx={{
                  backgroundColor: kpi.color,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                  },
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {kpi.label}
                  </Typography>

                  <Typography variant="h5" fontWeight={700}>
                    ${formatCurrency(kpi.value)}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      mt: 1,
                      display: "block",
                      color: isPositive
                        ? "success.main"
                        : "error.main",
                    }}
                  >
                    {isPositive ? "▲" : "▼"}{" "}
                    {percent.toFixed(1)}% vs mes anterior
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {/* ✅ NUEVA TABLA DE PENDIENTES */}
      {!loading && (
        <Box mb={4}>
          <Typography variant="h6" mb={2}>
            {t("amounts")} {t("status")}
          </Typography>

          {monthWindow.map(m => {
            const items = pendingByMonth[m.key] || [];

            if (!items.length) return null;

            const groupedByGroup: Record<string, any[]> = {};
            items.forEach(item => {
              if (!groupedByGroup[item.groupName]) {
                groupedByGroup[item.groupName] = [];
              }
              groupedByGroup[item.groupName].push(item);
            });

            const monthTotal = items.reduce(
              (sum, item) => sum + Number(item.amount || 0),
              0
            );

            return (
              <Paper key={m.key} sx={{ mb: 3, p: 2 }}>
                <Typography fontWeight={600} mb={2}>
                  {m.label}
                </Typography>

                {Object.entries(groupedByGroup).map(([groupName, groupItems]) => (
                  <Box key={groupName} mb={2}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.7 }}>
                      {groupName}
                    </Typography>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                <TableCell>{t("structure")}</TableCell>
                <TableCell align="right">{t("amount")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.accountName}</TableCell>
                            <TableCell align="right">
                              ${formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}

                {/* ✅ Total del mes */}
                <Box
                  mt={2}
                  pt={2}
                  display="flex"
                  justifyContent="flex-end"
                  sx={{
                    borderTop: "2px solid #e0e0e0",
                  }}
                >
                  <Typography fontWeight={700}>
                    Total Pendiente Mes: ${formatCurrency(monthTotal)}
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {loading ? (
        <Skeleton height={400} sx={{ borderRadius: 2 }} />
      ) : (
        <Paper elevation={2}>
        <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Cuenta</TableCell>
            {monthWindow.map(m => (
              <TableCell key={m.key} align="right">
                {m.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {Object.entries(grouped).map(([groupName, accounts]) => (
            <>
              <TableRow
                key={groupName}
                sx={{
                  backgroundColor: "#f5f5f5",
                  "&:hover": { backgroundColor: "#eeeeee" },
                }}
              >
                <TableCell>
                  <IconButton size="small" onClick={() => toggleGroup(groupName)}>
                    {openGroups[groupName] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                  <strong>{groupName}</strong>
                </TableCell>

                {monthWindow.map(m => (
                  <TableCell key={m.key} align="right">
                    <strong>${formatCurrency(groupTotals[groupName][m.key])}</strong>
                  </TableCell>
                ))}
              </TableRow>

              {openGroups[groupName] &&
                accounts.map(acc => (
                  <TableRow
                    key={acc.id}
                    sx={{
                      "&:nth-of-type(odd)": {
                        backgroundColor: "#fafafa",
                      },
                    }}
                  >
                    <TableCell sx={{ pl: 4 }}>{acc.name}</TableCell>
                    {monthWindow.map(m => {
                      const record = acc.amountMap[m.key];
                      const isUnpaidCurrentMonth =
                        m.key === currentMonth.key &&
                        record &&
                        record.status !== "PAID";

                      return (
                        <TableCell
                          key={m.key}
                          align="right"
                          sx={{
                            color: isUnpaidCurrentMonth
                              ? "error.main"
                              : "inherit",
                            fontWeight: isUnpaidCurrentMonth ? 600 : "normal",
                          }}
                        >
                          ${formatCurrency(record?.amount || 0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </>
          ))}

          {ungrouped.map(acc => (
            <TableRow key={acc.id}>
              <TableCell>{acc.name}</TableCell>
              {monthWindow.map(m => {
                const record = acc.amountMap[m.key];
                return (
                  <TableCell key={m.key} align="right">
                    ${formatNumber(record?.amount || 0)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}

          {/* TOTAL GENERAL */}
          <TableRow
            sx={{
              backgroundColor: "#e0e0e0",
              borderTop: "2px solid #9e9e9e",
            }}
          >
            <TableCell>
              <strong>Total Mes</strong>
            </TableCell>
            {monthWindow.map(m => (
              <TableCell key={m.key} align="right">
                <strong>${formatCurrency(globalTotals[m.key])}</strong>
              </TableCell>
            ))}
          </TableRow>

          {/* TOTAL PAGADO */}
          <TableRow sx={{ backgroundColor: "#e8f5e9" }}>
            <TableCell><strong>Total Pagado</strong></TableCell>
            {monthWindow.map(m => (
              <TableCell key={m.key} align="right">
                <strong>${formatCurrency(paidTotals[m.key])}</strong>
              </TableCell>
            ))}
          </TableRow>

          {/* TOTAL PENDIENTE */}
          <TableRow sx={{ backgroundColor: "#ffebee" }}>
            <TableCell><strong>Total Pendiente</strong></TableCell>
            {monthWindow.map(m => (
              <TableCell key={m.key} align="right">
                <strong>${formatCurrency(pendingTotals[m.key])}</strong>
              </TableCell>
            ))}
          </TableRow>

          {/* DEUDA REAL (incluye arrastres) */}
          <TableRow sx={{ backgroundColor: "#fff3e0" }}>
            <TableCell><strong>Deuda Real</strong></TableCell>
            {monthWindow.map(m => (
              <TableCell key={m.key} align="right">
                <strong>${formatCurrency(realDebtTotals[m.key])}</strong>
              </TableCell>
            ))}
          </TableRow>

        </TableBody>
        </Table>
        </Paper>
      )}
    </Box>
  );
}
