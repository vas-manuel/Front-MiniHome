import { gql, useQuery, useMutation } from "@apollo/client";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  MenuItem,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import { formatCurrency } from "./utils/format";

const GET_SAVINGS = gql`
  query GetSavings {
    savingsMovements {
      id
      year
      month
      type
      description
      amount
    }
    savingsTotal
  }
`;

const CREATE_SAVINGS = gql`
  mutation CreateSavings(
    $year: Int!
    $month: Int!
    $type: SavingsMovementType!
    $description: String!
    $amount: Float!
  ) {
    createSavingsMovement(
      year: $year
      month: $month
      type: $type
      description: $description
      amount: $amount
    ) {
      id
    }
  }
`;

const DELETE_SAVINGS = gql`
  mutation DeleteSavings($id: ID!) {
    deleteSavingsMovement(id: $id)
  }
`;

const monthNames = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

export default function SavingsManager() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [type, setType] = useState("DEPOSIT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const { data, refetch } = useQuery(GET_SAVINGS, {
    fetchPolicy: "network-only",
  });

  const [createSavings] = useMutation(CREATE_SAVINGS);
  const [deleteSavings] = useMutation(DELETE_SAVINGS);

  const handleCreate = async () => {
    if (!description || !amount) return;

    const numericAmount = Number(amount);
    const currentSavingsTotal = Number(data?.savingsTotal || 0);

    // ✅ Validar que no se retire más de lo ahorrado
    if (type === "WITHDRAW" && numericAmount > currentSavingsTotal) {
      alert("No puedes retirar un monto mayor al ahorro disponible.");
      return;
    }

    await createSavings({
      variables: {
        year,
        month,
        type,
        description,
        amount: numericAmount,
      },
    });

    setDescription("");
    setAmount("");
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteSavings({ variables: { id } });
    refetch();
  };

  const savingsTotal = Number(data?.savingsTotal || 0);

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Mantenedor de Ahorro
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            select
            label="Año"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ minWidth: 140 }}
          >
            {availableYears.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Mes"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            sx={{ minWidth: 150 }}
          >
            {monthNames.map((m, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {m}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="DEPOSIT">Depósito</MenuItem>
            <MenuItem value="WITHDRAW">Retiro</MenuItem>
          </TextField>

          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />

          <TextField
            label="Monto"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            sx={{ minWidth: 200 }}
          />

          <Button variant="contained" onClick={handleCreate}>
            Guardar
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          Saldo Actual: ${formatCurrency(savingsTotal)}
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Período</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.savingsMovements || []).map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>
                  {monthNames[m.month - 1]} {m.year}
                </TableCell>
                <TableCell>
                  {m.type === "DEPOSIT" ? "Depósito" : "Retiro"}
                </TableCell>
                <TableCell>{m.description}</TableCell>
                <TableCell align="right">
                  ${formatCurrency(m.amount)}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(m.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
