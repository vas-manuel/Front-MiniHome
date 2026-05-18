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
  IconButton,
  Stack,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import { formatCurrency } from "./utils/format";

const GET_INCOMES = gql`
  query GetIncomes($year: Int!, $month: Int!) {
    householdIncomes(year: $year, month: $month) {
      id
      year
      month
      description
      amount
    }
  }
`;

const CREATE_INCOME = gql`
  mutation CreateIncome(
    $year: Int!
    $month: Int!
    $description: String!
    $amount: Float!
  ) {
    createHouseholdIncome(
      year: $year
      month: $month
      description: $description
      amount: $amount
    ) {
      id
    }
  }
`;

const DELETE_INCOME = gql`
  mutation DeleteIncome($id: ID!) {
    deleteHouseholdIncome(id: $id)
  }
`;

export default function HouseholdIncomeManager() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(today.getMonth() + 1);

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const { data, refetch } = useQuery(GET_INCOMES, {
    variables: { year, month },
  });

  const [createIncome] = useMutation(CREATE_INCOME);
  const [deleteIncome] = useMutation(DELETE_INCOME);

  const handleCreate = async () => {
    if (!description || !amount) return;

    await createIncome({
      variables: {
        year,
        month,
        description,
        amount: Number(amount),
      },
    });

    setDescription("");
    setAmount("");
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteIncome({ variables: { id } });
    refetch();
  };

  const total = (data?.householdIncomes || []).reduce(
    (sum: number, i: any) => sum + Number(i.amount),
    0
  );

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Mantenedor de Ingresos
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
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
            sx={{ minWidth: 160 }}
          >
            {monthNames.map((name, index) => (
              <MenuItem key={index + 1} value={index + 1}>
                {name}
              </MenuItem>
            ))}
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
            Agregar
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          Ingresos del período
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Período</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.householdIncomes || []).map((income: any) => (
              <TableRow key={income.id}>
                <TableCell>
                  {monthNames[income.month - 1]} {income.year}
                </TableCell>
                <TableCell>{income.description}</TableCell>
                <TableCell align="right">
                  ${formatCurrency(income.amount)}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(income.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            <TableRow>
              <TableCell />
              <TableCell>
                <strong>Total</strong>
              </TableCell>
              <TableCell align="right">
                <strong>${formatCurrency(total)}</strong>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
