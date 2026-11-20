import { createTheme, alpha } from "@mui/material/styles";
import {
  colors,
  ColorMode,
  fonts,
  typeScale,
  radius,
  elevation,
  motion,
  breakpoints,
  touchTarget,
} from "./tokens";

declare module "@mui/material/styles" {
  interface Palette {
    brandTokens: (typeof colors)["light"];
  }
  interface PaletteOptions {
    brandTokens?: (typeof colors)["light"];
  }
}

/* Tema MUI construido exclusivamente desde los tokens de marca */
export function createAppTheme(mode: ColorMode) {
  const c = colors[mode];
  const isDark = mode === "dark";

  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: breakpoints.tablet,
        md: breakpoints.desktop,
        lg: 1200,
        xl: breakpoints.wide,
      },
    },
    palette: {
      mode,
      brandTokens: c,
      primary: {
        main: c.primary,
        dark: c.primaryPressed,
        light: c.primaryHover,
        contrastText: c.onPrimary,
      },
      secondary: {
        main: c.textSecondary,
        contrastText: c.surface,
      },
      success: { main: c.success, light: c.successSubtle, contrastText: isDark ? c.bg : "#FFFFFF" },
      warning: { main: c.warning, light: c.warningSubtle, contrastText: isDark ? c.bg : "#FFFFFF" },
      error: { main: c.danger, light: c.dangerSubtle, contrastText: isDark ? c.bg : "#FFFFFF" },
      info: { main: c.info, light: c.infoSubtle, contrastText: c.onPrimary },
      background: { default: c.bg, paper: c.surface },
      text: { primary: c.text, secondary: c.textSecondary, disabled: c.textMuted },
      divider: c.border,
      action: {
        selected: c.primarySubtle,
        hover: alpha(c.primary, isDark ? 0.12 : 0.06),
      },
    },
    shape: { borderRadius: radius.md },
    typography: {
      fontFamily: fonts.body,
      h1: typeScale("display"),
      h2: typeScale("h1"),
      h3: typeScale("h1"),
      h4: typeScale("h2"),
      h5: typeScale("h2"),
      h6: typeScale("h3"),
      subtitle1: typeScale("body-lg"),
      subtitle2: { ...typeScale("label"), color: c.textSecondary },
      body1: typeScale("body"),
      body2: typeScale("label"),
      caption: typeScale("caption"),
      button: { ...typeScale("body"), fontWeight: 600, textTransform: "none" },
    },
    transitions: {
      easing: {
        easeInOut: motion.standard,
        easeOut: motion.standard,
        easeIn: motion.standard,
        sharp: motion.standard,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: c.bg, color: c.text },
          ":focus-visible": { outline: `2px solid ${c.focusRing}`, outlineOffset: 2 },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0ms !important",
              transitionDuration: "0ms !important",
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: "none" },
          rounded: { borderRadius: radius.lg },
          outlined: { borderColor: c.border },
          elevation0: {
            border: `1px solid ${c.border}`,
          },
          elevation1: { boxShadow: isDark ? "none" : elevation[1], border: isDark ? `1px solid ${c.border}` : undefined },
          elevation2: { boxShadow: isDark ? "none" : elevation[2], border: isDark ? `1px solid ${c.border}` : undefined },
          elevation8: { boxShadow: isDark ? "none" : elevation[3], border: isDark ? `1px solid ${c.borderStrong}` : undefined, backgroundColor: c.surfaceRaised },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { borderRadius: radius.lg, border: `1px solid ${c.border}`, boxShadow: isDark ? "none" : elevation[1] },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: touchTarget,
            borderRadius: radius.md,
            paddingInline: 20,
            fontWeight: 600,
            transition: `background-color ${motion.fast} ${motion.standard}`,
          },
          sizeSmall: { minHeight: 36, paddingInline: 12 },
          containedPrimary: {
            "&:hover": { backgroundColor: c.primaryHover },
            "&:active": { backgroundColor: c.primaryPressed },
          },
          outlined: { borderColor: c.borderStrong, color: c.text },
          outlinedError: { borderColor: c.danger, color: c.danger },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: radius.md },
          sizeMedium: { width: touchTarget, height: touchTarget },
        },
      },
      MuiTextField: { defaultProps: { variant: "outlined" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
            backgroundColor: c.surface,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: c.border },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: c.borderStrong },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: c.focusRing, borderWidth: 2 },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: c.danger },
          },
          input: { minHeight: 24 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: radius.sm, fontWeight: 500 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: radius.xl, backgroundColor: c.surfaceRaised },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontFamily: fonts.display, fontWeight: 600 } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: isDark ? c.surfaceRaised : c.text, color: isDark ? c.text : c.surface, fontSize: 12, borderRadius: radius.sm },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
            minHeight: touchTarget,
            "&.Mui-selected": { backgroundColor: c.primarySubtle, color: c.primary },
            "&.Mui-selected .MuiListItemIcon-root": { color: c.primary },
            "&.Mui-selected:hover": { backgroundColor: c.primarySubtle },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { color: c.textSecondary, minWidth: 40 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: c.border },
          head: { color: c.textSecondary, fontWeight: 600 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 9999, backgroundColor: isDark ? c.border : c.bg },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: radius.md } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 40,
            "&.Mui-selected": { backgroundColor: c.primarySubtle, color: c.primary },
          },
        },
      },
    },
  });
}

/* Estilo para montos: cifras tabulares (BRAND.md §4) */
export const amountSx = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
} as const;
