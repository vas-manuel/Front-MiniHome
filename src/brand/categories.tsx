import { Box, alpha, useTheme } from "@mui/material";
import WaterDropRounded from "@mui/icons-material/WaterDropRounded";
import LightbulbRounded from "@mui/icons-material/LightbulbRounded";
import LocalFireDepartmentRounded from "@mui/icons-material/LocalFireDepartmentRounded";
import WifiRounded from "@mui/icons-material/WifiRounded";
import SmartphoneRounded from "@mui/icons-material/SmartphoneRounded";
import TvRounded from "@mui/icons-material/TvRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import DirectionsCarRounded from "@mui/icons-material/DirectionsCarRounded";
import ReceiptRounded from "@mui/icons-material/ReceiptRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { CategoryKey, categoryColors } from "./tokens";

const ICONS: Record<CategoryKey, SvgIconComponent> = {
  agua: WaterDropRounded,
  luz: LightbulbRounded,
  gas: LocalFireDepartmentRounded,
  internet: WifiRounded,
  telefonia: SmartphoneRounded,
  "tv-streaming": TvRounded,
  "gastos-comunes": ApartmentRounded,
  "arriendo-dividendo": HomeRounded,
  educacion: SchoolRounded,
  "seguros-salud": ShieldRounded,
  transporte: DirectionsCarRounded,
  otro: ReceiptRounded,
};

/* Palabras clave → categoría (BRAND.md §3, §6). Se revisa nombre de la cuenta y luego el grupo. */
const KEYWORDS: [CategoryKey, string[]][] = [
  ["gastos-comunes", ["gastos comunes", "gasto comun", "condominio", "edificio", "administracion"]],
  ["arriendo-dividendo", ["arriendo", "dividendo", "hipotec", "alquiler", "credito hipotecario"]],
  ["agua", ["agua", "sanitaria", "esval", "essbio", "aguas andinas"]],
  ["luz", ["luz", "electric", "enel", "cge", "chilquinta", "energia"]],
  ["gas", ["gas", "lipigas", "abastible", "gasco", "metrogas"]],
  ["internet", ["internet", "wifi", "fibra", "vtr", "mundo", "banda ancha"]],
  ["telefonia", ["telefon", "celular", "movil", "entel", "movistar", "claro", "wom"]],
  ["tv-streaming", ["tv", "television", "netflix", "spotify", "disney", "hbo", "prime", "streaming", "youtube", "directv", "cable"]],
  ["educacion", ["colegio", "educa", "universidad", "jardin", "matricula", "escolar", "curso"]],
  ["seguros-salud", ["seguro", "isapre", "fonasa", "salud", "clinica", "medic", "dental"]],
  ["transporte", ["tag", "autopista", "permiso de circulacion", "bencina", "combustible", "auto", "transporte", "estacionamiento", "revision tecnica"]],
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function matchWord(text: string, keyword: string) {
  // Palabras cortas (tv, gas, tag) deben coincidir como palabra completa
  if (keyword.length <= 3) return new RegExp(`(^|[^a-z])${keyword}([^a-z]|$)`).test(text);
  return text.includes(keyword);
}

export function categoryFor(name: string, groupName?: string | null): CategoryKey {
  for (const source of [name, groupName ?? ""]) {
    const text = normalize(source);
    if (!text) continue;
    for (const [key, words] of KEYWORDS) {
      if (words.some((w) => matchWord(text, w))) return key;
    }
  }
  return "otro";
}

/* Ícono de categoría en un cuadrado redondeado de 40 px (BRAND.md §3) */
export function CategoryTile({ name, groupName, size = 40 }: { name: string; groupName?: string | null; size?: number }) {
  const theme = useTheme();
  const key = categoryFor(name, groupName);
  const Icon = ICONS[key];
  const { fg, bg } = categoryColors(key);
  const dark = theme.palette.mode === "dark";
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "12px",
        display: "grid",
        placeItems: "center",
        // Las categorías solo tienen variante clara: en oscuro se usa un tinte del mismo color
        bgcolor: dark ? alpha(fg, 0.28) : bg,
        color: dark ? theme.palette.text.primary : fg,
      }}
    >
      <Icon sx={{ fontSize: size * 0.55 }} />
    </Box>
  );
}
