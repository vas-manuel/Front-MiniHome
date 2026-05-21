import { gql, useMutation, useQuery } from "@apollo/client";
import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Paper,
  Skeleton,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

/* =======================
   GRAPHQL
======================= */

const GET_GROUPS = gql`
  query {
    billGroups {
      id
      name
    }
  }
`;

const GET_ACCOUNTS = gql`
  query GetAccounts($type: BillAccountType!) {
    billAccounts(type: $type) {
      id
      name
      type
      due_day
      visible
      group {
        id
        name
      }
    }
  }
`;

const CREATE_GROUP = gql`
  mutation CreateGroup($name: String!) {
    createBillGroup(name: $name) {
      id
      name
    }
  }
`;

const CREATE_ACCOUNT = gql`
  mutation CreateAccount(
    $name: String!
    $type: BillAccountType!
    $bill_group_id: ID
    $due_day: Int
  ) {
    createBillAccount(
      name: $name
      type: $type
      bill_group_id: $bill_group_id
      due_day: $due_day
    ) {
      id
      name
    }
  }
`;

const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount(
    $id: ID!
    $name: String
    $bill_group_id: ID
    $due_day: Int
    $visible: Boolean
  ) {
    updateBillAccount(
      id: $id
      name: $name
      bill_group_id: $bill_group_id
      due_day: $due_day
      visible: $visible
    ) {
      id
    }
  }
`;

const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteBillAccount(id: $id)
  }
`;

/* =======================
   COMPONENT
======================= */

export default function BillStructureManager() {
  const [tab, setTab] = useState<"FIXED" | "VARIABLE">("FIXED");
  const [open, setOpen] = useState(false);

  const [accountName, setAccountName] = useState("");
  const [groupId, setGroupId] = useState<string | "">("");
  const [groupNameInline, setGroupNameInline] = useState("");
  const [dueDay, setDueDay] = useState<string>("");
  const [visible, setVisible] = useState(true);


  const { data: groupsData, refetch: refetchGroups } = useQuery(GET_GROUPS);
  const { data: fixedData, loading: loadingFixed, refetch: refetchFixed } =
    useQuery(GET_ACCOUNTS, {
      variables: { type: "FIXED" },
    });

  const {
    data: variableData,
    loading: loadingVariable,
    refetch: refetchVariable,
  } = useQuery(GET_ACCOUNTS, {
    variables: { type: "VARIABLE" },
  });

  const [createGroup] = useMutation(CREATE_GROUP);
  const [createAccount] = useMutation(CREATE_ACCOUNT);
  const [updateAccount] = useMutation(UPDATE_ACCOUNT);
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    let finalGroupId: string | null = groupId || null;

    // ✅ Si se escribió un nuevo grupo, siempre priorizarlo
    if (groupNameInline && groupNameInline.trim() !== "") {
      const res = await createGroup({
        variables: { name: groupNameInline.trim() },
      });

      finalGroupId = res.data.createBillGroup.id;

      // ✅ Actualizar select internamente (evitar null)
      setGroupId(finalGroupId || "");

      await refetchGroups();
    }

    if (editingId) {
      await updateAccount({
        variables: {
          id: editingId,
          name: accountName,
          bill_group_id: finalGroupId,
          due_day:
            tab === "FIXED" && dueDay
              ? Number(dueDay)
              : null,
          visible,
        },
      });
    } else {
      await createAccount({
        variables: {
          name: accountName,
          type: tab,
          bill_group_id: finalGroupId,
          due_day:
            tab === "FIXED" && dueDay
              ? Number(dueDay)
              : null,
        },
      });
    }

    setOpen(false);
    setEditingId(null);
    setAccountName("");
    setGroupId("");
    setGroupNameInline("");
    setDueDay("");
    setVisible(true);

    await refetchFixed();
    await refetchVariable();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteAccount({ variables: { id: confirmDelete } });
    setConfirmDelete(null);
    await refetchFixed();
    await refetchVariable();
  };

  const rows = useMemo(() => {
    const source =
      tab === "FIXED"
        ? fixedData?.billAccounts
        : variableData?.billAccounts;

    return (
      source?.map((a: any) => ({
        id: a.id,
        name: a.name,
        group: a.group?.name || "",
        groupId: a.group?.id || "",
        due_day: a.due_day || "",
        visible: a.visible,
      })) || []
    );
  }, [tab, fixedData, variableData]);

  const columns: GridColDef[] = [
    { field: "name", headerName: "Cuenta", flex: 1 },
    { field: "group", headerName: "Grupo", flex: 1 },
    ...(tab === "FIXED"
      ? [{ field: "due_day", headerName: "Vencimiento", width: 130 }]
      : []),
    {
      field: "visible",
      headerName: "Visible",
      width: 120,
      renderCell: (params) => (
        <Button
          size="small"
          variant={params.value ? "contained" : "outlined"}
          color={params.value ? "success" : "secondary"}
          onClick={async () => {
            await updateAccount({
              variables: {
                id: params.row.id,
                visible: !params.value,
              },
            });
            await refetchFixed();
            await refetchVariable();
          }}
        >
          {params.value ? "Visible" : "Oculto"}
        </Button>
      ),
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton
            size="small"
            onClick={() => {
              setEditingId(params.row.id);
              setAccountName(params.row.name);
              setGroupId(params.row.groupId || "");
              setDueDay(params.row.due_day);
              setVisible(params.row.visible);
              setOpen(true);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setConfirmDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Mantenedor de Cuentas
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab label="Cuentas Fijas" value="FIXED" />
        <Tab label="Cuentas de Consumo" value="VARIABLE" />
      </Tabs>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Crear Cuenta
        </Button>
      </Box>

      <Paper
        sx={{
          p: 2,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
          },
        }}
      >
        {loadingFixed || loadingVariable ? (
          <Box>
            <Skeleton height={40} sx={{ mb: 2 }} />
            <Skeleton height={40} sx={{ mb: 2 }} />
            <Skeleton height={40} />
          </Box>
        ) : (
          <div style={{ height: 450, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSizeOptions={[10, 20, 50]}
              localeText={
                esES.components.MuiDataGrid.defaultProps.localeText
              }
              initialState={{
                pagination: { paginationModel: { pageSize: 20, page: 0 } },
              }}
            />
          </div>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>
          {editingId ? "Editar Cuenta" : "Crear Cuenta"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label={
                tab === "VARIABLE"
                  ? "Nombre Cuenta de Consumo"
                  : "Nombre Cuenta"
              }
              helperText={
                tab === "VARIABLE"
                  ? "Ejemplo: Supermercado, Farmacia, Delivery"
                  : ""
              }
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Grupo"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Sin Grupo</MenuItem>
              {groupsData?.billGroups.map((g: any) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="caption">
              Si el grupo no existe, créalo aquí:
            </Typography>

            <TextField
              label="Nuevo Grupo"
              value={groupNameInline}
              onChange={(e) => setGroupNameInline(e.target.value)}
              fullWidth
            />

            {tab === "FIXED" && (
              <TextField
                label="Día Vencimiento"
                type="text"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                value={dueDay}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setDueDay(value);
                  }
                }}
                fullWidth
              />
            )}

            {tab === "VARIABLE" && (
              <Typography variant="body2" color="text.secondary">
                Las cuentas de consumo no requieren día de vencimiento.
              </Typography>
            )}

            {editingId && (
              <TextField
                select
                label="Visible"
                value={visible ? "true" : "false"}
                onChange={(e) => setVisible(e.target.value === "true")}
                fullWidth
              >
                <MenuItem value="true">Visible</MenuItem>
                <MenuItem value="false">Oculto</MenuItem>
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>
            {editingId ? "Actualizar" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
