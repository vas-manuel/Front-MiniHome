import { gql, useQuery, useMutation } from "@apollo/client";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
} from "@mui/material";
import { useState } from "react";

const GET_SAAS_METRICS = gql`
  query {
    saasMetrics {
      mrr
      arr
      arpu
      churnRate
      ltv
      growthRate
      nrr
    }
  }
`;

const GET_ADMIN_HOUSEHOLDS = gql`
  query {
    households {
      id
      name
      subscriptionStatus
      daysRemaining
      plan {
        id
        name
      }
      totalUsers
      userLimit
      usagePercentageUsers
      totalBillAccounts
      accountLimit
      usagePercentageAccounts
    }
  }
`;

const GET_PLANS = gql`
  query {
    plans {
      id
      name
    }
  }
`;

const UPDATE_HOUSEHOLD_PLAN = gql`
  mutation UpdateHouseholdPlan(
    $householdId: ID!
    $planId: ID!
    $subscriptionStatus: SubscriptionStatus!
  ) {
    updateHouseholdPlan(
      householdId: $householdId
      planId: $planId
      subscriptionStatus: $subscriptionStatus
    ) {
      id
    }
  }
`;

const DEACTIVATE_HOUSEHOLD = gql`
  mutation DeactivateHousehold($id: ID!) {
    deactivateHousehold(id: $id) {
      id
      status
    }
  }
`;

const ACTIVATE_HOUSEHOLD = gql`
  mutation ActivateHousehold($id: ID!) {
    activateHousehold(id: $id) {
      id
      status
    }
  }
`;

export default function AdminDashboard() {
  const { data, refetch } = useQuery(GET_ADMIN_HOUSEHOLDS);
  const { data: plansData } = useQuery(GET_PLANS);
  const { data: metricsData, loading: metricsLoading } = useQuery(GET_SAAS_METRICS);
  const [updatePlan] = useMutation(UPDATE_HOUSEHOLD_PLAN);
  const [deactivateHousehold] = useMutation(DEACTIVATE_HOUSEHOLD);
  const [activateHousehold] = useMutation(ACTIVATE_HOUSEHOLD);

  const [open, setOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState("");

  const getColor = (value?: number) => {
    if (!value) return "success";
    if (value > 90) return "error";
    if (value > 70) return "warning";
    return "success";
  };

  return (
    <Box>
      <Typography variant="h5" mb={3} fontWeight={600}>
        Panel Administrativo SaaS
      </Typography>

      {/* ✅ Métricas SaaS */}
      <Box mb={4} sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {metricsLoading ? (
          <LinearProgress sx={{ width: "100%" }} />
        ) : (
          [
            { label: "MRR", value: metricsData?.saasMetrics?.mrr },
            { label: "ARR", value: metricsData?.saasMetrics?.arr },
            { label: "ARPU", value: metricsData?.saasMetrics?.arpu },
            { label: "Churn %", value: metricsData?.saasMetrics?.churnRate },
          ].map((metric, index) => (
            <Box
              key={index}
              sx={{
                flex: "1 1 200px",
                minWidth: 200,
                p: 2,
                borderRadius: 2,
                background: "#f5f5f5",
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {metric.label}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {metric.label.includes("%")
                  ? `${metric.value?.toFixed(2) ?? 0}%`
                  : `$${metric.value?.toLocaleString() ?? 0}`}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      <Paper elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Hogar</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Usuarios</TableCell>
              <TableCell>Cuentas</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acción</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data?.households?.map((h: any) => (
              <TableRow key={h.id}>
                <TableCell>{h.name}</TableCell>

                <TableCell>{h.plan?.name || "-"}</TableCell>

                <TableCell>
                  {h.totalUsers}/{h.userLimit || "-"}
                  <LinearProgress
                    variant="determinate"
                    value={h.usagePercentageUsers || 0}
                    color={getColor(h.usagePercentageUsers)}
                    sx={{ mt: 1, height: 6, borderRadius: 2 }}
                  />
                </TableCell>

                <TableCell>
                  {h.totalBillAccounts}/{h.accountLimit || "-"}
                  <LinearProgress
                    variant="determinate"
                    value={h.usagePercentageAccounts || 0}
                    color={getColor(h.usagePercentageAccounts)}
                    sx={{ mt: 1, height: 6, borderRadius: 2 }}
                  />
                </TableCell>

                <TableCell>
                  <Typography
                    color={
                      h.daysRemaining !== null && h.daysRemaining < 7
                        ? "error"
                        : "inherit"
                    }
                    fontWeight={
                      h.daysRemaining !== null && h.daysRemaining < 7
                        ? 600
                        : 400
                    }
                  >
                    {h.daysRemaining ?? "-"} días
                  </Typography>
                </TableCell>

                <TableCell>
                  <Chip
                    label={
                      h.usagePercentageUsers > 95 ||
                      h.usagePercentageAccounts > 95
                        ? "LÍMITE CRÍTICO"
                        : h.subscriptionStatus
                    }
                    color={
                      h.usagePercentageUsers > 95 ||
                      h.usagePercentageAccounts > 95
                        ? "error"
                        : h.subscriptionStatus === "ACTIVE"
                        ? "success"
                        : h.subscriptionStatus === "TRIAL"
                        ? "warning"
                        : "error"
                    }
                    size="small"
                  />
                </TableCell>

                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                    onClick={() => {
                      setSelectedHousehold(h);
                      setSelectedPlan(h.plan?.id || "");
                      setOpen(true);
                    }}
                  >
                    Cambiar Plan
                  </Button>

                  {h.subscriptionStatus === "ACTIVE" && (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ mr: 1 }}
                      onClick={async () => {
                        await deactivateHousehold({
                          variables: { id: h.id },
                        });
                        refetch();
                      }}
                    >
                      Dar de baja
                    </Button>
                  )}

                  {h.subscriptionStatus === "INACTIVE" && (
                    <Button
                      size="small"
                      color="success"
                      variant="outlined"
                      onClick={async () => {
                        await activateHousehold({
                          variables: { id: h.id },
                        });
                        refetch();
                      }}
                    >
                      Activar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Cambiar Plan</DialogTitle>
        <DialogContent>
          <Select
            fullWidth
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as string)}
          >
            {plansData?.plans?.map((p: any) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await updatePlan({
                variables: {
                  householdId: selectedHousehold.id,
                  planId: selectedPlan,
                  subscriptionStatus: "ACTIVE",
                },
              });
              setOpen(false);
              refetch();
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
