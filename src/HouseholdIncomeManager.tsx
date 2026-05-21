import { gql, useQuery, useMutation } from "@apollo/client";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { IconButton, Tooltip } from "@mui/material";
import { useMemo, useState } from "react";
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
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
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

    const numericAmount = Number(amount.replace(/\./g, ""));

    await createIncome({
      variables: {
        year,
        month,
        description,
        amount: numericAmount,
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

  const rows = useMemo(() => {
    return (data?.householdIncomes || []).map((income: any) => ({
      id: income.id,
      period: `${monthNames[income.month - 1]} ${income.year}`,
      description: income.description,
      amount: income.amount,
    }));
  }, [data]);

  const columns: GridColDef[] = [
    { field: "period", headerName: "Período", flex: 1 },
    { field: "description", headerName: "Descripción", flex: 1.5 },
    {
      field: "amount",
      headerName: "Monto",
      flex: 1,
      renderCell: (params) => (
        <strong>${formatCurrency(params.value)}</strong>
      ),
    },
    {
      field: "actions",
      headerName: "Acciones",
      flex: 0.7,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Eliminar">
          <IconButton
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

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
            value={amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/\./g, "");
              if (/^[0-9]*$/.test(raw)) {
                const formatted = raw
                  ? new Intl.NumberFormat("es-CL").format(Number(raw))
                  : "";
                setAmount(formatted);
              }
            }}
            inputMode="numeric"
            fullWidth
            sx={{ minWidth: 200 }}
          />

          <Button variant="contained" onClick={handleCreate}>
            Agregar
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          pageSizeOptions={[10, 20, 50]}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          initialState={{
            pagination: { paginationModel: { pageSize: 20, page: 0 } },
          }}
        />
      </Paper>
    </Box>
  );
}
