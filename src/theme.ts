import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1e293b",        // Nuevo color principal (igual cabecera)
      light: "#334155",
      dark: "#0f172a",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#334155",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        color: "primary",
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 600,
          padding: "8px 18px",
          transition: "all 0.25s ease",
        },
        contained: {
          background: "linear-gradient(90deg,#0f172a,#1e293b)",
          color: "#ffffff",
          boxShadow: "0 6px 18px rgba(15,23,42,0.30)",
        },
        containedPrimary: {
          background: "linear-gradient(90deg,#0f172a,#1e293b)",
        },
        containedSecondary: {
          backgroundColor: "#334155",
          color: "#fff",
        },
        outlined: {
          borderColor: "#1e293b",
          color: "#1e293b",
        },
        text: {
          color: "#1e293b",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#1e293b",
          transition: "all 0.2s ease",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
        colorPrimary: {
          backgroundColor: "#1e293b",
          color: "#fff",
        },
        colorSuccess: {
          backgroundColor: "#14532d",
          color: "#fff",
        },
        colorError: {
          backgroundColor: "#7f1d1d",
          color: "#fff",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(90deg,#0f172a,#1e293b)",
        },
      },
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
  },
});

export default theme;
