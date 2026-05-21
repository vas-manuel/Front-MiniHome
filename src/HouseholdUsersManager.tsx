import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Avatar,
  Fade,
  Skeleton,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { IconButton, Tooltip } from "@mui/material";

/* =======================
   GRAPHQL
======================= */

const LIST_USERS = gql`
  query {
    householdUsers {
      id
      name
      email
      role
      provider
      active
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $role: Role!
  ) {
    createUser(name: $name, email: $email, password: $password, role: $role) {
      id
      name
      email
      role
      provider
      active
    }
  }
`;

/* =======================
   COMPONENT
======================= */

const UPDATE_USER_STATUS = gql`
  mutation UpdateUserStatus($id: ID!, $active: Boolean!) {
    updateUserStatus(id: $id, active: $active) {
      id
      active
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

export default function HouseholdUsersManager() {
  const { data, loading, refetch } = useQuery(LIST_USERS);
  const [createUser] = useMutation(CREATE_USER);
  const [updateUserStatus] = useMutation(UPDATE_USER_STATUS);
  const [deleteUser] = useMutation(DELETE_USER);

  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MANAGER",
    provider: "LOCAL",
  });

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "MANAGER",
      provider: "LOCAL",
    });
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (editingUser) {
      await updateUserStatus({
        variables: {
          id: editingUser.id,
          active: editingUser.active,
        },
      });
    } else {
      await createUser({
        variables: {
          name: form.name,
          email: form.email,
          password: form.provider === "LOCAL" ? form.password : "",
          role: form.role,
        },
      });
    }

    setOpen(false);
    resetForm();
    refetch();
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Usuario",
        flex: 1.2,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.2,
              overflow: "hidden",
            }}
          >
            <Typography
              fontWeight="600"
              fontSize={14}
              sx={{ lineHeight: 1.2 }}
              noWrap
            >
              {params.row.name}
            </Typography>
            <Typography
              fontSize={12}
              color="text.secondary"
              sx={{ lineHeight: 1.2 }}
              noWrap
            >
              {params.row.email}
            </Typography>
          </Box>
        ),
      },
      {
        field: "role",
        headerName: "Rol",
        flex: 0.7,
        renderCell: (params) => (
          <Chip
            label={params.row.role}
            color={params.row.role === "MANAGER" ? "primary" : "default"}
            size="small"
          />
        ),
      },
      {
        field: "provider",
        headerName: "Proveedor",
        flex: 0.7,
      },
      {
        field: "active",
        headerName: "Estado",
        flex: 0.6,
        renderCell: (params) => (
          <Chip
            label={params.row.active ? "Activo" : "Inactivo"}
            color={params.row.active ? "success" : "default"}
            size="small"
          />
        ),
      },
      {
        field: "actions",
        headerName: "Operaciones",
        flex: 0.8,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingUser(params.row);
                  setForm({
                    name: params.row.name,
                    email: params.row.email,
                    password: "",
                    role: params.row.role,
                    provider: params.row.provider || "LOCAL",
                  });
                  setOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip
              title={
                params.row.active
                  ? "Desactivar Usuario"
                  : "Activar Usuario"
              }
            >
              <IconButton
                size="small"
                onClick={async () => {
                  await updateUserStatus({
                    variables: {
                      id: params.row.id,
                      active: !params.row.active,
                    },
                  });
                  refetch();
                }}
              >
                {params.row.active ? (
                  <ToggleOffIcon fontSize="small" />
                ) : (
                  <ToggleOnIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                onClick={async () => {
                  await deleteUser({
                    variables: { id: params.row.id },
                  });
                  refetch();
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    []
  );

  return (
    <Fade in timeout={400}>
      <Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Gestión de Usuarios del Hogar
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Administra los miembros de tu hogar y sus permisos.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background: "linear-gradient(145deg, #f8fafc, #ffffff)",
            border: "1px solid #e0e0e0",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            },
          }}
        >
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: "bold",
              }}
              onClick={() => setOpen(true)}
            >
              Nuevo Usuario
            </Button>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid #e0e0e0",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            },
          }}
        >
          {loading ? (
            <Box p={3}>
              <Skeleton height={40} sx={{ mb: 2 }} />
              <Skeleton height={40} sx={{ mb: 2 }} />
              <Skeleton height={40} sx={{ mb: 2 }} />
            </Box>
          ) : (
            <DataGrid
              autoHeight
              rowHeight={52}
              rows={data?.householdUsers || []}
              columns={columns}
              getRowId={(row: any) => row.id}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 20, 50]}
              localeText={
                esES.components.MuiDataGrid.defaultProps.localeText
              }
              initialState={{
                pagination: { paginationModel: { pageSize: 20, page: 0 } },
              }}
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f1f5f9",
                  fontWeight: "bold",
                },
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                },
              }}
            />
          )}
        </Paper>

        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="sm"
        >
        <DialogTitle fontWeight="bold">
          {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
        </DialogTitle>

          <DialogContent>
            <Stack spacing={3} mt={2}>
              <TextField
                label="Nombre"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                fullWidth
              />

              <TextField
                label="Email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                fullWidth
                disabled={!!editingUser}
              />

              <TextField
                select
                label="Tipo de Login"
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="LOCAL">Email + Contraseña</MenuItem>
                <MenuItem value="GOOGLE">Google</MenuItem>
              </TextField>

              {form.provider === "LOCAL" && !editingUser && (
                <TextField
                  label="Contraseña"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  fullWidth
                />
              )}

              <TextField
                select
                label="Rol"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="MANAGER">MANAGER</MenuItem>
                <MenuItem value="VIEWER">VIEWER</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              sx={{ borderRadius: 3, textTransform: "none" }}
              onClick={handleSave}
            >
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
}
