import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from "@mui/material";
import { useState } from "react";

const GET_PLANS = gql`
  query {
    plans {
      id
      name
      maxUsers
      maxBillAccounts
      maxHistoryMonths
      priceMonthly
    }
  }
`;

const CREATE_PLAN = gql`
  mutation CreatePlan(
    $name: String!
    $maxUsers: Int!
    $maxBillAccounts: Int!
    $maxHistoryMonths: Int!
    $priceMonthly: Float!
  ) {
    createPlan(
      name: $name
      maxUsers: $maxUsers
      maxBillAccounts: $maxBillAccounts
      maxHistoryMonths: $maxHistoryMonths
      priceMonthly: $priceMonthly
    ) {
      id
      name
    }
  }
`;

export default function PlanManager() {
  const { data, loading, refetch } = useQuery(GET_PLANS);
  const [createPlan] = useMutation(CREATE_PLAN);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    maxUsers: 1,
    maxBillAccounts: 1,
    maxHistoryMonths: 12,
    priceMonthly: 0,
  });

  const handleCreate = async () => {
    await createPlan({
      variables: {
        ...form,
        maxUsers: Number(form.maxUsers),
        maxBillAccounts: Number(form.maxBillAccounts),
        maxHistoryMonths: Number(form.maxHistoryMonths),
        priceMonthly: Number(form.priceMonthly),
      },
    });
    setOpen(false);
    refetch();
  };

  return (
    <Box>
      <Typography variant="h6" mb={2}>
        Mantenedor de Planes
      </Typography>

      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpen(true)}>
        Crear Plan
      </Button>

      <Paper
        sx={{
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
          },
        }}
      >
        {loading ? (
          <Box p={3}>
            <Skeleton height={40} sx={{ mb: 2 }} />
            <Skeleton height={40} sx={{ mb: 2 }} />
            <Skeleton height={40} />
          </Box>
        ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Usuarios</TableCell>
              <TableCell>Cuentas</TableCell>
              <TableCell>Historial</TableCell>
              <TableCell>Precio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.plans?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.maxUsers}</TableCell>
                <TableCell>{p.maxBillAccounts}</TableCell>
                <TableCell>{p.maxHistoryMonths}</TableCell>
                <TableCell>${p.priceMonthly}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Nuevo Plan</DialogTitle>
        <DialogContent>
          {Object.keys(form).map((key) => (
            <TextField
              key={key}
              margin="dense"
              label={key}
              fullWidth
              value={(form as any)[key]}
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
