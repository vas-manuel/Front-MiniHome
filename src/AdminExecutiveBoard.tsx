import React, { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import {
  Box,
  Typography,
  Paper,
  Button,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
);

const GET_EXECUTIVE = gql`
  query {
    financialSummary {
      mrr
    }
    financialForecast {
      projected12Months
    }
    saasMetrics {
      arr
      arpu
      churnRate
      ltv
      growthRate
      nrr
    }
    revenueHistory {
      month
      year
      amount
    }
  }
`;

export default function AdminExecutiveBoard() {
  const { data } = useQuery(GET_EXECUTIVE);
  const [darkMode, setDarkMode] = useState(false);

  const exportPDF = () => {
    window.print();
  };

  const mrr = data?.financialSummary?.mrr || 0;
  const forecast12 = data?.financialForecast?.projected12Months || 0;
  const metrics = data?.saasMetrics || {};
  const history = data?.revenueHistory || [];

  const lastMonthRevenue =
    history.length > 0 ? history[history.length - 1].amount : 0;

  const previousMonthRevenue =
    history.length > 1 ? history[history.length - 2].amount : 0;

  const revenueDelta =
    previousMonthRevenue > 0
      ? (lastMonthRevenue - previousMonthRevenue) /
        previousMonthRevenue
      : 0;

  const revenueDeltaColor =
    revenueDelta > 0
      ? "#2e7d32"
      : revenueDelta < 0
      ? "#d32f2f"
      : "#ed6c02";

  const growthColor =
    metrics.growthRate > 0
      ? "#2e7d32"
      : metrics.growthRate < 0
      ? "#d32f2f"
      : "#ed6c02";

  const healthScore =
    metrics.growthRate > 0.05
      ? 90
      : metrics.growthRate > 0
      ? 75
      : metrics.growthRate === 0
      ? 60
      : 40;

  const healthColor =
    healthScore >= 80
      ? "#2e7d32"
      : healthScore >= 60
      ? "#ed6c02"
      : "#d32f2f";

  // 🔮 Regresión lineal simple para forecast institucional
  const regressionForecast = () => {
    if (history.length < 2) return 0;

    const n = history.length;
    const xs: number[] = history.map((_: any, i: number) => i + 1);
    const ys: number[] = history.map((r: any) => Number(r.amount));

    const sumX = xs.reduce((a: number, b: number) => a + b, 0);
    const sumY = ys.reduce((a: number, b: number) => a + b, 0);
    const sumXY = xs.reduce(
      (a: number, _: number, i: number) => a + xs[i] * ys[i],
      0
    );
    const sumXX = xs.reduce((a: number, b: number) => a + b * b, 0);

    const slope =
      (n * sumXY - sumX * sumY) /
      (n * sumXX - sumX * sumX);

    const intercept = (sumY - slope * sumX) / n;

    const nextX = n + 1;
    return slope * nextX + intercept;
  };

  const forecastRegression = regressionForecast();

  const lineData = {
    labels: [
      ...history.map((r: any) => `${r.month}/${r.year}`),
      "Forecast+1",
    ],
    datasets: [
      {
        label: "Revenue Histórico",
        data: [
          ...history.map((r: any) => r.amount),
          forecastRegression,
        ],
        borderColor: "#2F80ED",
        backgroundColor: "rgba(47,128,237,0.15)",
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "#27AE60",
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#1F2937",
          font: {
            family: "Inter",
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#1F2937",
        bodyColor: "#1F2937",
        borderColor: "#2F80ED",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#6B7280",
        },
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
      y: {
        ticks: {
          color: "#6B7280",
        },
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
    },
  };

  const barData = {
    labels: ["ARR", "ARPU", "LTV"],
    datasets: [
      {
        label: "Indicadores SaaS",
        data: [metrics.arr || 0, metrics.arpu || 0, metrics.ltv || 0],
        backgroundColor: ["#2F80ED", "#56CCF2", "#27AE60"],
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#1F2937",
          font: {
            family: "Inter",
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#1F2937",
        bodyColor: "#1F2937",
        borderColor: "#2F80ED",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#6B7280",
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: "#6B7280",
        },
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
    },
  };

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "#121212" : "transparent",
        color: darkMode ? "#fff" : "inherit",
        minHeight: "100vh",
        p: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          🚀 Executive VC Board
        </Typography>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
              />
            }
            label="Dark Mode"
          />

          <Button
            variant="contained"
            onClick={exportPDF}
            sx={{ ml: 2 }}
          >
            📄 Exportar PDF
          </Button>
        </Box>
      </Box>

      {/* KPI CARDS */}
      <Box display="flex" gap={3} mb={4}>
        <KpiCard
          title="MRR"
          value={`$${mrr.toFixed(2)}`}
          subtitle={`Δ ${(
            revenueDelta * 100
          ).toFixed(2)}% vs mes anterior`}
          color={revenueDeltaColor}
        />
        <KpiCard
          title="ARR"
          value={`$${(metrics.arr || 0).toFixed(2)}`}
          subtitle="Annual Recurring Revenue"
        />
        <KpiCard
          title="Growth Rate"
          value={`${((metrics.growthRate || 0) * 100).toFixed(2)}%`}
          color={growthColor}
          subtitle="Vs último mes"
        />
        <KpiCard
          title="NRR"
          value={`${((metrics.nrr || 0) * 100).toFixed(2)}%`}
          subtitle="Net Revenue Retention"
        />
        <KpiCard
          title="Health Score"
          value={`${healthScore}/100`}
          color={healthColor}
          subtitle="Indicador institucional"
        />
      </Box>

      {/* HISTORICAL REVENUE */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            📈 Revenue Histórico
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Último mes: ${lastMonthRevenue.toFixed(2)}
          </Typography>
        </Box>
        <Line data={lineData} options={lineOptions} />
      </Paper>

      {/* SECONDARY METRICS */}
      <Box display="flex" gap={3}>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" mb={2}>
            Indicadores Financieros
          </Typography>
          <Bar data={barData} options={barOptions} />
        </Paper>

        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" mb={2}>
            Forecast Avanzado
          </Typography>
          <Typography variant="h4">
            ${forecast12.toFixed(2)}
          </Typography>
          <Typography variant="body2">
            Forecast Regresión: $
            {forecastRegression.toFixed(2)}
          </Typography>
          <Typography variant="body2">
            Churn Rate: {((metrics.churnRate || 0) * 100).toFixed(2)}%
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  color = "#1976d2",
}: {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <Paper
      sx={{
        p: 3,
        flex: 1,
        borderLeft: `6px solid ${color}`,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}
