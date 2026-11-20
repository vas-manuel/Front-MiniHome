import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Typography,
} from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import { useLanguage } from "../i18n";
import { AppRoute, SECTION_LABEL } from "./routes";

interface NavProps {
  routes: AppRoute[];
  activePath: string;
  isLocked: (r: AppRoute) => boolean;
  onNavigate: (path: string) => void;
}

/* Lista agrupada por sección para el sidebar de escritorio y el panel "Más" en móvil */
export function NavList({ routes, activePath, isLocked, onNavigate }: NavProps) {
  const { t } = useLanguage();
  const sections = Array.from(new Set(routes.map((r) => r.section)));

  return (
    <Box component="nav" aria-label="Principal">
      {sections.map((section) => (
        <List
          key={section}
          dense
          sx={{ px: 1.5, py: 0.5 }}
          subheader={
            <ListSubheader
              disableSticky
              sx={{ bgcolor: "transparent", lineHeight: "32px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary" }}
            >
              {t(SECTION_LABEL[section])}
            </ListSubheader>
          }
        >
          {routes
            .filter((r) => r.section === section)
            .map((r) => {
              const locked = isLocked(r);
              const item = (
                <ListItemButton
                  key={r.path}
                  selected={activePath === r.path}
                  aria-current={activePath === r.path ? "page" : undefined}
                  disabled={locked}
                  onClick={() => onNavigate(r.path)}
                  sx={{ mb: 0.5 }}
                >
                  <ListItemIcon>{r.icon}</ListItemIcon>
                  <ListItemText primary={t(r.labelKey)} primaryTypographyProps={{ fontWeight: 500, fontSize: 15 }} />
                  {locked && <LockRounded fontSize="small" aria-label={t("lockedFeature")} />}
                </ListItemButton>
              );
              return locked ? (
                <Tooltip key={r.path} title={t("lockedFeature")} placement="right">
                  <span>{item}</span>
                </Tooltip>
              ) : (
                item
              );
            })}
        </List>
      ))}
    </Box>
  );
}

/* Navigation rail para tablet (600–1023 px): íconos con etiqueta corta */
export function NavRail({ routes, activePath, isLocked, onNavigate }: NavProps) {
  const { t } = useLanguage();
  return (
    <Box component="nav" aria-label="Principal" sx={{ display: "flex", flexDirection: "column", gap: 0.5, px: 1, py: 1 }}>
      {routes.map((r) => {
        const active = activePath === r.path;
        const locked = isLocked(r);
        return (
          <Tooltip key={r.path} title={locked ? t("lockedFeature") : t(r.labelKey)} placement="right">
            <span>
              <ListItemButton
                selected={active}
                aria-current={active ? "page" : undefined}
                aria-label={t(r.labelKey)}
                disabled={locked}
                onClick={() => onNavigate(r.path)}
                sx={{ flexDirection: "column", py: 1, px: 0.5, gap: 0.25 }}
              >
                <ListItemIcon sx={{ minWidth: 0 }}>{locked ? <LockRounded /> : r.icon}</ListItemIcon>
                <Typography
                  sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, textAlign: "center", maxWidth: 72 }}
                  noWrap
                >
                  {t(r.shortLabelKey ?? r.labelKey)}
                </Typography>
              </ListItemButton>
            </span>
          </Tooltip>
        );
      })}
    </Box>
  );
}
