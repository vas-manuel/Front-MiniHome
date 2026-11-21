/*
 * Miembros del hogar (solo el titular): agregar, editar nombre/rol/contraseña, activar o desactivar
 * y eliminar. El titular no se modifica desde aquí. Los límites del plan los aplica el backend.
 */
import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PersonAddRounded from "@mui/icons-material/PersonAddRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import PersonOffRounded from "@mui/icons-material/PersonOffRounded";
import HowToRegRounded from "@mui/icons-material/HowToRegRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { PageHeader } from "./components/common";
import { useLanguage } from "./i18n";
import { useSession } from "./app/session";
import { gqlErrorCode, PlanLimitAlert, usePlanLabel } from "./features/plans/planLimit";

const MEMBERS = gql`
  query HouseholdMembers {
    householdUsers {
      id
      name
      email
      role
      provider
      active
    }
    me {
      id
      household {
        id
        plan {
          id
          name
        }
        totalUsers
        userLimit
      }
    }
  }
`;

const USER_FIELDS = `id name email role provider active`;

const CREATE_USER = gql`
  mutation CreateUser($name: String!, $email: String!, $password: String!, $role: Role!) {
    createUser(name: $name, email: $email, password: $password, role: $role) { ${USER_FIELDS} }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateHouseholdUser($id: ID!, $name: String, $role: Role, $password: String) {
    updateHouseholdUser(id: $id, name: $name, role: $role, password: $password) { ${USER_FIELDS} }
  }
`;

const SET_ACTIVE = gql`
  mutation SetHouseholdUserActive($id: ID!, $active: Boolean!) {
    setHouseholdUserActive(id: $id, active: $active) { ${USER_FIELDS} }
  }
`;

const DELETE_USER = gql`
  mutation DeleteHouseholdUser($id: ID!) {
    deleteHouseholdUser(id: $id)
  }
`;

interface Member {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "VIEWER";
  provider: "LOCAL" | "GOOGLE";
  active: boolean;
}

type FormState = { name: string; email: string; role: "MANAGER" | "VIEWER"; access: "LOCAL" | "GOOGLE"; password: string };
const EMPTY: FormState = { name: "", email: "", role: "MANAGER", access: "LOCAL", password: "" };
const MIN_PASSWORD = 8;
const REFRESH = { refetchQueries: ["HouseholdMembers", "PlanAlerts", "PlansPage"], awaitRefetchQueries: true };

export default function HouseholdUsersManager() {
  const { t } = useLanguage();
  const planLabel = usePlanLabel();
  const { user: me } = useSession();
  const { data, loading, error } = useQuery(MEMBERS, { fetchPolicy: "cache-and-network" });
  const [createUser, { loading: creating }] = useMutation(CREATE_USER, REFRESH);
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, REFRESH);
  const [setActive] = useMutation(SET_ACTIVE, REFRESH);
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER, REFRESH);

  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; member?: Member } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; member: Member } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const members: Member[] = data?.householdUsers ?? [];
  const household = data?.me?.household;
  const isOwner = me.role === "OWNER";

  const messageFor = (err: any) => {
    const code = gqlErrorCode(err);
    if (code === "PLAN_LIMIT") return "PLAN_LIMIT";
    if (code === "EMAIL_TAKEN") return t("userEmailTaken");
    if (code === "VALIDATION" || code === "USER_HAS_ACTIVITY") return err?.graphQLErrors?.[0]?.message ?? t("userSaveError");
    return t("userSaveError");
  };

  const openCreate = () => {
    setForm(EMPTY);
    setFormError(null);
    setDialog({ mode: "create" });
  };
  const openEdit = (m: Member) => {
    setForm({ name: m.name, email: m.email, role: m.role === "VIEWER" ? "VIEWER" : "MANAGER", access: m.provider, password: "" });
    setFormError(null);
    setDialog({ mode: "edit", member: m });
  };

  const passwordInvalid = form.password !== "" && form.password.length < MIN_PASSWORD;
  const canSubmit =
    form.name.trim() !== "" &&
    (dialog?.mode === "edit" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) &&
    !passwordInvalid &&
    !(dialog?.mode === "create" && form.access === "LOCAL" && form.password === "");

  const submit = async () => {
    setFormError(null);
    try {
      if (dialog?.mode === "create") {
        await createUser({
          variables: {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            password: form.access === "LOCAL" ? form.password : "",
          },
        });
        setToast(t("membersAdded", { name: form.name.trim() }));
      } else if (dialog?.member) {
        await updateUser({
          variables: { id: dialog.member.id, name: form.name.trim(), role: form.role, password: form.password || null },
        });
        setToast(t("membersSaved"));
      }
      setDialog(null);
    } catch (err) {
      setFormError(messageFor(err));
    }
  };

  const toggleActive = async (m: Member) => {
    setListError(null);
    try {
      await setActive({ variables: { id: m.id, active: !m.active } });
      setToast(t(m.active ? "membersDeactivated" : "membersActivated", { name: m.name }));
    } catch (err) {
      setListError(messageFor(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await deleteUser({ variables: { id: toDelete.id } });
      setToast(t("membersDeleted", { name: toDelete.name }));
      setToDelete(null);
    } catch (err) {
      setDeleteError(gqlErrorCode(err) === "USER_HAS_ACTIVITY" ? "USER_HAS_ACTIVITY" : messageFor(err));
    }
  };

  const usage =
    household && household.userLimit != null
      ? t("membersUsage", { used: household.totalUsers, limit: household.userLimit, plan: planLabel(household.plan?.name) })
      : household
      ? t("membersUsageUnlimited", { used: household.totalUsers, plan: planLabel(household.plan?.name) })
      : "";

  return (
    <Box>
      <PageHeader
        title={t("navMembers")}
        subtitle={usage || t("membersSubtitle")}
        actions={
          isOwner && (
            <Button variant="contained" startIcon={<PersonAddRounded />} onClick={openCreate}>
              {t("membersAdd")}
            </Button>
          )
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{t("genericError")}</Alert>}
      {listError === "PLAN_LIMIT" && <Box sx={{ mb: 2 }}><PlanLimitAlert message={t("planLimitUsers")} onClose={() => setListError(null)} /></Box>}
      {listError && listError !== "PLAN_LIMIT" && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setListError(null)}>{listError}</Alert>}

      <Paper sx={{ overflow: "hidden" }}>
        {loading && !data ? (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={56} />
            ))}
          </Box>
        ) : (
          <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {members.map((m, i) => {
              const self = m.id === me.id;
              const manageable = isOwner && m.role !== "OWNER" && !self;
              return (
                <Stack
                  key={m.id}
                  component="li"
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderTop: i ? 1 : 0, borderColor: "divider", opacity: m.active ? 1 : 0.6 }}
                >
                  <Avatar sx={{ bgcolor: m.active ? "primary.main" : "action.disabled", color: "primary.contrastText", fontWeight: 600 }}>
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap>
                      {m.name}
                      {self ? ` (${t("membersYou")})` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {m.email} · {t(m.provider === "GOOGLE" ? "membersAccessGoogle" : "membersAccessPassword")}
                    </Typography>
                    {/* En pantallas angostas el rol va bajo el correo, para no cortar el nombre */}
                    <Stack direction="row" spacing={1} sx={{ mt: 0.75, display: { xs: "flex", sm: "none" } }}>
                      <Chip size="small" label={t(`role${m.role}`)} color={m.role === "OWNER" ? "primary" : "default"} variant={m.role === "OWNER" ? "filled" : "outlined"} />
                      {!m.active && <Chip size="small" label={t("membersInactive")} />}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", sm: "flex" } }}>
                    <Chip size="small" label={t(`role${m.role}`)} color={m.role === "OWNER" ? "primary" : "default"} variant={m.role === "OWNER" ? "filled" : "outlined"} />
                    {!m.active && <Chip size="small" label={t("membersInactive")} />}
                  </Stack>
                  {manageable ? (
                    <IconButton aria-label={t("membersActions", { name: m.name })} onClick={(e) => setMenu({ anchor: e.currentTarget, member: m })}>
                      <MoreVertRounded />
                    </IconButton>
                  ) : (
                    <Box sx={{ width: 40 }} />
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {t("membersRolesHelp")}
      </Typography>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            openEdit(menu!.member);
            setMenu(null);
          }}
        >
          <ListItemIcon>
            <EditRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("edit")}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            toggleActive(menu!.member);
            setMenu(null);
          }}
        >
          <ListItemIcon>{menu?.member.active ? <PersonOffRounded fontSize="small" /> : <HowToRegRounded fontSize="small" />}</ListItemIcon>
          <ListItemText>{t(menu?.member.active ? "membersDeactivate" : "membersActivate")}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteError(null);
            setToDelete(menu!.member);
            setMenu(null);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteOutlineRounded fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>{t("delete")}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Agregar / editar */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.mode === "edit" ? t("membersEditTitle") : t("membersAddTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {formError === "PLAN_LIMIT" && <PlanLimitAlert message={t("planLimitUsers")} />}
            {formError && formError !== "PLAN_LIMIT" && <Alert severity="error">{formError}</Alert>}
            <TextField label={t("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus fullWidth />
            <TextField
              label={t("email")}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={dialog?.mode === "edit"}
              helperText={dialog?.mode === "edit" ? t("membersEmailFixed") : undefined}
              fullWidth
            />
            <TextField
              select
              label={t("membersRole")}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as FormState["role"] })}
              fullWidth
            >
              <MenuItem value="MANAGER">
                <ListItemText primary={t("roleMANAGER")} secondary={t("membersRoleManagerHelp")} />
              </MenuItem>
              <MenuItem value="VIEWER">
                <ListItemText primary={t("roleVIEWER")} secondary={t("membersRoleViewerHelp")} />
              </MenuItem>
            </TextField>

            {dialog?.mode === "create" ? (
              <>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t("membersAccessLabel")}
                  </Typography>
                  <ToggleButtonGroup exclusive size="small" value={form.access} onChange={(_, v) => v && setForm({ ...form, access: v })}>
                    <ToggleButton value="LOCAL">{t("membersAccessPassword")}</ToggleButton>
                    <ToggleButton value="GOOGLE">{t("membersAccessGoogle")}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                {form.access === "LOCAL" ? (
                  <TextField
                    label={t("password")}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    error={passwordInvalid}
                    helperText={t("membersPasswordHelp", { n: MIN_PASSWORD })}
                    autoComplete="new-password"
                    fullWidth
                  />
                ) : (
                  <Alert severity="info">{t("membersGoogleHelp")}</Alert>
                )}
              </>
            ) : (
              <TextField
                label={t("membersNewPassword")}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={passwordInvalid}
                helperText={t("membersNewPasswordHelp", { n: MIN_PASSWORD })}
                autoComplete="new-password"
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)}>{t("cancel")}</Button>
          <Button variant="contained" onClick={submit} disabled={!canSubmit || creating || updating}>
            {dialog?.mode === "edit" ? t("save") : t("membersAdd")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Eliminar */}
      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("membersDeleteTitle", { name: toDelete?.name ?? "" })}</DialogTitle>
        <DialogContent>
          {deleteError === "USER_HAS_ACTIVITY" ? (
            <Alert severity="info">{t("membersHasActivity")}</Alert>
          ) : (
            <>
              {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
              <Typography>{t("membersDeleteBody")}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setToDelete(null)}>{t("cancel")}</Button>
          {deleteError === "USER_HAS_ACTIVITY" ? (
            toDelete?.active ? (
              <Button
                variant="contained"
                onClick={async () => {
                  const m = toDelete;
                  setToDelete(null);
                  if (m) await toggleActive(m);
                }}
              >
                {t("membersDeactivate")}
              </Button>
            ) : null
          ) : (
            <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
              {t("delete")}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </Box>
  );
}
