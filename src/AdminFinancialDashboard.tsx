import { gql, useQuery } from "@apollo/client";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";

const GET_FINANCIAL = gql`
  query {
    financialSummary {
      totalHouseholds
      activeSubscriptions
      mrr
    }
    planDistribution {
      planName
      households
    }
  }
`;

export default function AdminFinancialDashboard() {
  const { data } = useQuery(GET_FINANCIAL);

  const summary = data?.financialSummary;
  const distribution = data?.planDistribution || [];

  return (
    <Box>
      <Typography variant="h5" mb={3} fontWeight={600}>
        Dashboard Financiero Enterprise
      </Typography>

      {/* KPI CARDS */}
      <Box display="flex" gap={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2">Hogares Totales</Typography>
          <Typography variant="h6">
            {summary?.totalHouseholds || 0}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2">Suscripciones Activas</Typography>
          <Typography variant="h6">
            {summary?.activeSubscriptions || 0}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2">MRR</Typography>
          <Typography variant="h6">
            ${summary?.mrr?.toFixed(2) || "0.00"}
          </Typography>
        </Paper>
      </Box>

      {/* PLAN DISTRIBUTION */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" mb={2}>
          Distribución por Plan
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Plan</TableCell>
              <TableCell>Hogares</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distribution.map((p: any) => (
              <TableRow key={p.planName}>
                <TableCell>{p.planName}</TableCell>
                <TableCell>
                  <Chip label={p.households} color="primary" size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
