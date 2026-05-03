import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2F80ED", // Azul principal → acciones principales
      light: "#56CCF2",
      dark: "#1C5DB6",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#27AE60", // Verde → éxito / confirmaciones
      contrastText: "#ffffff",
    },
    success: {
      main: "#27AE60",
    },
    warning: {
      main: "#F2C94C", // Amarillo suave → alertas amigables
    },
    info: {
      main: "#56CCF2", // Celeste → tecnología / info
    },
    background: {
      default: "#F5F6F8", // Gris claro fondo general
      paper: "#ffffff",
    },
    text: {
      primary: "#1F2937",
      secondary: "#6B7280",
    },
  },

  shape: {
    borderRadius: 16,
  },

  typography: {
    fontFamily: "Inter, Poppins, Montserrat, Roboto, Arial, sans-serif",
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
    body1: {
      fontWeight: 400,
    },
    body2: {
      fontWeight: 400,
    },
  },

  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(90deg,#2F80ED,#56CCF2)",
          boxShadow: "0 4px 14px rgba(47,128,237,0.25)",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          padding: "8px",
        },
      },
    },

    MuiButton: {
      defaultProps: {
        color: "primary",
      },
      styleOverrides: {
        root: {
          borderRadius: 14,
          textTransform: "none",
          fontWeight: 600,
          padding: "10px 20px",
          transition: "all 0.25s ease",
        },
        containedPrimary: {
          background: "linear-gradient(90deg,#2F80ED,#56CCF2)",
          boxShadow: "0 6px 18px rgba(47,128,237,0.30)",
        },
        containedSecondary: {
          backgroundColor: "#27AE60",
          boxShadow: "0 6px 18px rgba(39,174,96,0.30)",
        },
        outlined: {
          borderWidth: "2px",
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#2F80ED",
          transition: "all 0.2s ease",
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 12,
        },
        colorPrimary: {
          backgroundColor: "#2F80ED",
          color: "#fff",
        },
        colorSuccess: {
          backgroundColor: "#27AE60",
          color: "#fff",
        },
        colorWarning: {
          backgroundColor: "#F2C94C",
          color: "#1F2937",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
        },
      },
    },
  },
});

export default theme;
