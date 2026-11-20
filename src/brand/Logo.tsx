import { Box, useTheme } from "@mui/material";
import { useId } from "react";
import { brand, fonts } from "./tokens";

/* Ícono MoniHome. Por debajo de 48 px usa la versión simplificada (BRAND.md §2). */
export function BrandIcon({ size = 40, title = "MoniHome" }: { size?: number; title?: string }) {
  const gid = useId().replace(/:/g, "");
  if (size <= 48) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={brand.gradientStart} />
            <stop offset="0.5" stopColor={brand.gradientMid} />
            <stop offset="1" stopColor={brand.gradientEnd} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill={`url(#g${gid})`} />
        <rect x="11" y="22" width="40" height="30" rx="8" fill="#FFFFFF" />
        <circle cx="25" cy="34" r="3" fill={brand.logoBlue} />
        <circle cx="37" cy="34" r="3" fill={brand.logoBlue} />
        <path d="M24 41 Q31 46 38 41" stroke={brand.logoBlue} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M40 15 L45 20 L54 11" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={brand.gradientStart} />
          <stop offset="0.5" stopColor={brand.gradientMid} />
          <stop offset="1" stopColor={brand.gradientEnd} />
        </linearGradient>
        <linearGradient id={`i${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0A8FB8" />
          <stop offset="1" stopColor="#3E9E5A" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="228" fill={`url(#g${gid})`} />
      <g transform="translate(-6 40)">
        <path d="M236 400 L664 272 Q770 246 780 320 L784 400 Z" fill={`url(#i${gid})`} opacity="0.55" />
        <rect x="200" y="380" width="600" height="420" rx="96" fill="#FFFFFF" />
        <path d="M236 392 L664 264" stroke="#FFFFFF" strokeWidth="56" strokeLinecap="round" fill="none" />
        <rect x="732" y="522" width="124" height="132" rx="44" fill="#FFFFFF" stroke="#E0B800" strokeWidth="20" />
        <path d="M686 226 L742 282 L850 174" stroke="#FFFFFF" strokeWidth="58" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="420" cy="560" r="34" fill={brand.logoBlue} />
        <circle cx="580" cy="560" r="34" fill={brand.logoBlue} />
        <path d="M410 650 Q500 720 590 650" stroke={brand.logoBlue} strokeWidth="30" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/* Logo horizontal: ícono + wordmark "Moni" azul / "Home" verde, adaptado a modo oscuro. */
export function Logo({ height = 40 }: { height?: number }) {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{ display: "inline-flex", alignItems: "center", gap: `${Math.round(height * 0.25)}px` }}
      role="img"
      aria-label="MoniHome"
    >
      <BrandIcon size={height} title="" />
      <Box
        component="span"
        aria-hidden
        sx={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: height * 0.6,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: dark ? brand.logoBlueOnDark : brand.logoBlue }}>Moni</span>
        <span style={{ color: dark ? brand.logoGreenOnDark : brand.logoGreen }}>Home</span>
      </Box>
    </Box>
  );
}
