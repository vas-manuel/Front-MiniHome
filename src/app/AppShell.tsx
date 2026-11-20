import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import { Logo, BrandIcon } from "../brand/Logo";
import { useLanguage } from "../i18n";
import { useSession } from "./session";
import { AppRoute, findRoute } from "./routes";
import { NavList, NavRail } from "./Navigation";
import { NotificationsButton, ThemeToggle, UserMenu } from "./TopBarActions";

const SIDEBAR_WIDTH = 264;
const RAIL_WIDTH = 88;
const BOTTOM_NAV_HEIGHT = 64;

/*
 * Layout por superficie (BRAND.md §8):
 * - Web ≥ 1024: sidebar fija + contenido con ancho máximo 1200
 * - Tablet 600–1023: navigation rail
 * - Móvil < 600: barra inferior (3 destinos + "Más")
 */
export function AppShell({ routes, children }: { routes: AppRoute[]; children: ReactNode }) {
  const theme = useTheme();
  const { t } = useLanguage();
  const { can } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [moreOpen, setMoreOpen] = useState(false);

  const isLocked = (r: AppRoute) => !can(r.permission);
  const current = findRoute(routes, pathname);

  useEffect(() => {
    document.title = current ? `${t(current.labelKey)} · MoniHome` : "MoniHome";
  }, [current, t]);

  const go = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  const c = theme.palette.brandTokens;
  const mobilePrimary = routes.filter((r) => r.primaryMobile && !isLocked(r));
  const mobileValue = mobilePrimary.some((r) => r.path === pathname) ? pathname : "more";

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box
        component="a"
        href="#contenido"
        sx={{
          position: "absolute",
          left: -9999,
          "&:focus": { left: 16, top: 16, zIndex: 2000, bgcolor: "background.paper", p: 1, borderRadius: 1 },
        }}
      >
        {t("skipToContent")}
      </Box>

      {!isMobile && (
        <Box
          component="aside"
          sx={{
            width: isDesktop ? SIDEBAR_WIDTH : RAIL_WIDTH,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100dvh",
            overflowY: "auto",
            bgcolor: "background.paper",
            borderRight: `1px solid ${c.border}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ px: isDesktop ? 3 : 0, py: 2.5, display: "flex", justifyContent: isDesktop ? "flex-start" : "center" }}>
            {isDesktop ? <Logo height={36} /> : <BrandIcon size={40} />}
          </Box>
          {isDesktop ? (
            <NavList routes={routes} activePath={pathname} isLocked={isLocked} onNavigate={go} />
          ) : (
            <NavRail routes={routes} activePath={pathname} isLocked={isLocked} onNavigate={go} />
          )}
          {isDesktop && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: "auto", px: 3, py: 2 }}>
              {t("closingLine")}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: theme.zIndex.appBar,
            bgcolor: "background.default",
            borderBottom: { xs: `1px solid ${c.border}`, sm: "none" },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ maxWidth: 1200 + 64, mx: "auto", px: { xs: 1, sm: 3, md: 4 }, py: 1 }}
          >
            {isMobile ? <Box sx={{ pl: 1 }}><Logo height={28} /></Box> : null}
            <Box sx={{ flex: 1 }} />
            <NotificationsButton />
            {!isMobile && <ThemeToggle />}
            <UserMenu />
          </Stack>
        </Box>

        <Box
          component="main"
          id="contenido"
          tabIndex={-1}
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 1200 + 64,
            mx: "auto",
            px: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 2, sm: 1 },
            pb: { xs: `${BOTTOM_NAV_HEIGHT + 24}px`, sm: 6 },
            outline: "none",
          }}
        >
          {children}
        </Box>
      </Box>

      {isMobile && (
        <>
          <Paper
            elevation={8}
            sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: theme.zIndex.appBar, borderRadius: 0, pb: "env(safe-area-inset-bottom)" }}
          >
            <BottomNavigation
              showLabels
              value={mobileValue}
              onChange={(_, value) => (value === "more" ? setMoreOpen(true) : go(value))}
              sx={{ height: BOTTOM_NAV_HEIGHT, bgcolor: "transparent" }}
            >
              {mobilePrimary.map((r) => (
                <BottomNavigationAction key={r.path} value={r.path} label={t(r.shortLabelKey ?? r.labelKey)} icon={r.icon} sx={{ minWidth: 64 }} />
              ))}
              <BottomNavigationAction value="more" label={t("navMore")} icon={<MoreHorizRounded />} sx={{ minWidth: 64 }} />
            </BottomNavigation>
          </Paper>
          <Drawer
            anchor="bottom"
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, pb: 2, maxHeight: "85dvh" } }}
          >
            <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", my: 1.5 }} />
            <NavList routes={routes} activePath={pathname} isLocked={isLocked} onNavigate={go} />
            <Box sx={{ px: 3, pt: 1 }}>
              <ThemeToggle />
            </Box>
          </Drawer>
        </>
      )}
    </Box>
  );
}
