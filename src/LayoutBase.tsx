import { ReactNode, useState, useMemo } from "react";
import { gql, useQuery, useMutation } from "@apollo/client";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Button,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
}

const GET_NOTIFICATION_DATA = gql`
  query {
    households {
      id
      name
      subscriptionStatus
      daysRemaining
      usagePercentageUsers
      usagePercentageAccounts
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation {
    logout
  }
`;

interface LayoutBaseProps {
  user: any;
  title: string;
  roleLabel?: string;
  planLabel?: string;
  menuItems: MenuItem[];
  disabledKeys?: string[];
  activeKey: string;
  onChangeSection: (key: string) => void;
  children: ReactNode;
  storageKey: string;
  notificationCount?: number;
}

export default function LayoutBase({
  user,
  title,
  roleLabel,
  planLabel,
  menuItems,
  disabledKeys = [],
  activeKey,
  onChangeSection,
  children,
  storageKey,
  notificationCount = 0,
}: LayoutBaseProps) {
  const [open, setOpen] = useState(
    localStorage.getItem(storageKey) !== "false"
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const drawerWidth = 240;
  const collapsedWidth = 72;

  const { data: notificationData } = useQuery(GET_NOTIFICATION_DATA);

  const notifications = useMemo(() => {
    const list: { id: string; message: string }[] = [];

    notificationData?.households?.forEach((h: any) => {
      if (h.daysRemaining !== null && h.daysRemaining <= 7) {
        list.push({
          id: `expire-${h.id}`,
          message: `⚠ ${h.name} vence en ${h.daysRemaining} días`,
        });
      }

      if (
        h.usagePercentageUsers > 95 ||
        h.usagePercentageAccounts > 95
      ) {
        list.push({
          id: `limit-${h.id}`,
          message: `🚨 ${h.name} en límite crítico`,
        });
      }
    });

    return list;
  }, [notificationData]);

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  const logout = async () => {
    try {
      await logoutMutation();
    } catch (e) {
      // incluso si falla backend, limpiar local
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.reload();
  };

  const handleCloseMenu = () => setAnchorEl(null);

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: "linear-gradient(90deg,#0f172a,#1e293b)",
        }}
      >
        <Toolbar>
          <Tooltip title={open ? "Contraer menú" : "Expandir menú"}>
            <IconButton
              onClick={() => {
                const newState = !open;
                setOpen(newState);
                localStorage.setItem(storageKey, String(newState));
              }}
              sx={{ mr: 2, color: "#fff" }}
            >
              {open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 3 }}>
            <Box
              component="img"
              src="/monihome-logo.png"
              alt="MoniHome"
              sx={{
                height: 40,
                display: "block",
              }}
            />
            <Box>
              <Typography sx={{ color: "#fff", fontWeight: 600 }}>
                {title}
              </Typography>
              {roleLabel && (
                <Typography sx={{ color: "#f87171", fontSize: 12 }}>
                  {roleLabel}
                </Typography>
              )}
            </Box>

            {planLabel && (
              <Chip
                label={`PLAN ${planLabel}`}
                size="small"
                sx={{
                  bgcolor:
                    planLabel === "FREE"
                      ? "#475569"
                      : planLabel === "PRO"
                      ? "#7c3aed"
                      : "#16a34a",
                  color: "#fff",
                  fontWeight: 600,
                }}
              />
            )}
          </Box>

          <Tooltip title="Notificaciones">
            <IconButton
              sx={{ color: "#fff", position: "relative" }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <NotificationsIcon />
              {notifications.length > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    minWidth: 16,
                    height: 16,
                    px: 0.5,
                    bgcolor: "#ef4444",
                    borderRadius: "10px",
                    fontSize: 10,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {notifications.length}
                </Box>
              )}
            </IconButton>
          </Tooltip>

          <Box>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ color: "#fff" }}
            >
              <Avatar sx={{ bgcolor: roleLabel ? "#7f1d1d" : "#334155" }}>
                {user?.name?.charAt(0)}
              </Avatar>
            </IconButton>

            {openMenu && (
              <Box
                onMouseLeave={handleCloseMenu}
                sx={{
                  position: "absolute",
                  right: 16,
                  top: 64,
                  bgcolor: "#fff",
                  boxShadow: 6,
                  borderRadius: 2,
                  p: 2,
                  minWidth: 260,
                }}
              >
                <Typography fontWeight={600} mb={1}>
                  Notificaciones
                </Typography>

                {notifications.length === 0 ? (
                  <Typography fontSize={13} color="text.secondary">
                    Sin alertas activas
                  </Typography>
                ) : (
                  notifications.map((n) => (
                    <Typography
                      key={n.id}
                      fontSize={13}
                      sx={{ mb: 1 }}
                    >
                      {n.message}
                    </Typography>
                  ))
                )}

                <Divider sx={{ my: 1 }} />

                <Button
                  startIcon={<LogoutIcon />}
                  fullWidth
                  onClick={logout}
                >
                  Cerrar sesión
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: open ? drawerWidth : collapsedWidth,
            transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => {
            const isDisabled = disabledKeys.includes(item.key);
            return (
              <Tooltip
                key={item.key}
                title={
                  isDisabled
                    ? "Disponible en Plan Superior"
                    : !open
                    ? item.label
                    : ""
                }
                placement="right"
              >
                <ListItemButton
                  selected={activeKey === item.key}
                  disabled={isDisabled}
                  onClick={() =>
                    !isDisabled && onChangeSection(item.key)
                  }
                  sx={{
                    justifyContent: open ? "flex-start" : "center",
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 0 }}>
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={
                        isDisabled
                          ? `${item.label} 🔒`
                          : item.label
                      }
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4, mt: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
