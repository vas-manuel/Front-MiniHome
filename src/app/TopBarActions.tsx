import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import { useLanguage } from "../i18n";
import { useColorMode } from "../brand/ColorMode";
import { useSession } from "./session";
import { useMonthBills } from "../features/thisMonth/useMonthBills";
import { StatusChip } from "../components/StatusChip";

const ADMIN_NOTIFICATIONS = gql`
  query AdminNotifications {
    households {
      id
      name
      daysRemaining
      usagePercentageUsers
      usagePercentageAccounts
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export function ThemeToggle() {
  const { t } = useLanguage();
  const { mode, toggleColorMode } = useColorMode();
  const label = mode === "dark" ? t("themeLight") : t("themeDark");
  return (
    <Tooltip title={label}>
      <IconButton onClick={toggleColorMode} aria-label={label}>
        {mode === "dark" ? <LightModeRounded /> : <DarkModeRounded />}
      </IconButton>
    </Tooltip>
  );
}

/* Avisos: para el hogar, cuentas vencidas o por vencer; para el sistema, hogares por expirar */
export function NotificationsButton() {
  const { t } = useLanguage();
  const { user, can } = useSession();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const today = new Date();
  const isSystemAdmin = user.role === "SYSTEM_ADMIN";
  const isHousehold = !(user.role === "ADMIN" || isSystemAdmin);

  const { bills } = useMonthBills(today.getFullYear(), today.getMonth() + 1, {
    skip: !isHousehold || !can("dashboard"),
  });
  const { data: adminData } = useQuery(ADMIN_NOTIFICATIONS, { skip: !isSystemAdmin });

  const billAlerts = useMemo(
    () => bills.filter((b) => b.state === "overdue" || b.state === "dueSoon"),
    [bills]
  );
  const adminAlerts = useMemo(() => {
    const list: { id: string; message: string }[] = [];
    adminData?.households?.forEach((h: any) => {
      if (h.daysRemaining !== null && h.daysRemaining <= 7) {
        list.push({ id: `e-${h.id}`, message: t("notifExpires", { name: h.name, days: h.daysRemaining }) });
      }
      if (h.usagePercentageUsers > 95 || h.usagePercentageAccounts > 95) {
        list.push({ id: `l-${h.id}`, message: t("notifLimit", { name: h.name }) });
      }
    });
    return list;
  }, [adminData, t]);

  const count = isHousehold ? billAlerts.length : adminAlerts.length;
  const label = `${t("notifications")}${count ? ` (${count})` : ""}`;

  return (
    <>
      <Tooltip title={t("notifications")}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={label}>
          <Badge badgeContent={count} color="error">
            <NotificationsRounded />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Typography sx={{ px: 2, py: 1, fontWeight: 600 }}>{t("notifications")}</Typography>
        <Divider />
        {count === 0 && (
          <Typography sx={{ px: 2, py: 2 }} color="text.secondary">
            {t("noNotifications")}
          </Typography>
        )}
        {billAlerts.map((b) => (
          <MenuItem
            key={b.accountId}
            onClick={() => {
              setAnchor(null);
              navigate("/");
            }}
            sx={{ py: 1.5, display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Typography noWrap>{b.name}</Typography>
            <StatusChip state={b.state} daysUntilDue={b.daysUntilDue} dueDate={b.dueDate} />
          </MenuItem>
        ))}
        {adminAlerts.map((a) => (
          <MenuItem key={a.id} sx={{ whiteSpace: "normal", py: 1.5 }}>
            {a.message}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function UserMenu() {
  const { t } = useLanguage();
  const { user, plan, isAdmin, can } = useSession();
  const { mode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  const logout = async () => {
    try {
      await logoutMutation();
    } catch {
      /* aunque falle el backend, limpiamos la sesión local */
    }
    window.location.href = "/";
  };

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <>
      <Tooltip title={t("yourAccount")}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={t("yourAccount")}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600, fontSize: 16 }}>
            {initial}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={600}>{user.name || user.email}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t(`role${user.role}`)}
              {!isAdmin && plan ? ` · ${t("planName", { plan })}` : ""}
            </Typography>
          </Stack>
        </Box>
        <Divider />
        {!isAdmin && can("householdSettings") && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              navigate("/settings");
            }}
          >
            <ListItemIcon>
              <SettingsRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("navSettings")}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={toggleColorMode}>
          <ListItemIcon>
            {mode === "dark" ? <LightModeRounded fontSize="small" /> : <DarkModeRounded fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{mode === "dark" ? t("themeLight") : t("themeDark")}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("logout")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
