import { useEffect, useRef, useState } from "react";
import { Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import { amountSx } from "../brand/theme";
import { formatCompact, niceScale } from "../utils/format";

export interface BarSegment {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  /** De abajo hacia arriba. Un valor negativo se dibuja bajo el cero (por ejemplo, una pérdida). */
  segments: BarSegment[];
  labels: string[];
  formatValue: (v: number) => string;
  locale: string;
  ariaLabel: string;
  height?: number;
  /** Fila extra del tooltip (por ejemplo, el total cobrado) */
  totalLabel?: string;
  totals?: number[];
}

const PAD = { top: 12, right: 12, bottom: 28, left: 60 };
const GAP = 2; // separación de superficie entre segmentos (skill dataviz)
const R = 4; // extremo redondeado

/** Rectángulo con el extremo exterior redondeado (arriba si crece, abajo si es negativo) */
function barPath(x: number, y: number, w: number, h: number, roundTop: boolean, roundBottom: boolean) {
  const r = Math.min(R, w / 2, h);
  const tl = roundTop ? r : 0;
  const bl = roundBottom ? r : 0;
  return [
    `M${x},${y + tl}`,
    tl ? `Q${x},${y} ${x + tl},${y}` : "",
    `L${x + w - tl},${y}`,
    tl ? `Q${x + w},${y} ${x + w},${y + tl}` : "",
    `L${x + w},${y + h - bl}`,
    bl ? `Q${x + w},${y + h} ${x + w - bl},${y + h}` : "",
    `L${x + bl},${y + h}`,
    bl ? `Q${x},${y + h} ${x},${y + h - bl}` : "",
    "Z",
  ].join(" ");
}

/*
 * Barras apiladas por mes (skill dataviz): una sola escala, 2 px de separación entre segmentos,
 * extremo redondeado, leyenda siempre visible y tooltip por barra con todos los valores.
 */
export function StackedBarChart({ segments, labels, formatValue, locale, ariaLabel, height = 300, totalLabel, totals }: Props) {
  const theme = useTheme();
  const c = theme.palette.brandTokens;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = labels.length;
  const pos = labels.map((_, i) => segments.reduce((s, seg) => s + Math.max(0, seg.values[i] ?? 0), 0));
  const neg = labels.map((_, i) => segments.reduce((s, seg) => s + Math.min(0, seg.values[i] ?? 0), 0));
  const { min, max, ticks } = niceScale(Math.min(...neg, 0), Math.max(...pos, 0));

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, n);
  const barW = Math.max(6, Math.min(48, slot * 0.6));
  const xMid = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * innerH;
  const labelEvery = width < 520 ? 3 : width < 760 ? 2 : 1;

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }} role="list" aria-label="Leyenda">
        {segments.map((s) => (
          <Stack
            key={s.key}
            role="listitem"
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ px: 1.25, minHeight: 32, borderRadius: "8px", border: `1px solid ${c.border}`, color: "text.secondary", fontSize: 13, fontWeight: 500 }}
          >
            <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: s.color }} />
            <span>{s.label}</span>
          </Stack>
        ))}
      </Stack>

      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg width={width} height={height} role="img" aria-label={ariaLabel} style={{ display: "block" }} onMouseLeave={() => setHover(null)}>
          {ticks.map((tk, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tk)} y2={y(tk)} stroke={c.border} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tk)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={c.textMuted}>
                {formatCompact(tk, locale)}
              </text>
            </g>
          ))}

          {labels.map((_, i) => {
            const x = xMid(i) - barW / 2;
            let up = 0;
            let down = 0;
            const ups = segments.filter((s) => (s.values[i] ?? 0) > 0);
            const downs = segments.filter((s) => (s.values[i] ?? 0) < 0);
            return (
              <g key={i} opacity={hover === null || hover === i ? 1 : 0.55}>
                {ups.map((s, k) => {
                  const v = s.values[i];
                  const y1 = y(up + v);
                  const y0 = y(up);
                  up += v;
                  const h = Math.max(0, y0 - y1 - (k < ups.length - 1 ? GAP : 0));
                  return <path key={s.key} d={barPath(x, y1 + (k < ups.length - 1 ? GAP : 0), barW, h, k === ups.length - 1, false)} fill={s.color} />;
                })}
                {downs.map((s, k) => {
                  const v = s.values[i];
                  const y0 = y(down);
                  const y1 = y(down + v);
                  down += v;
                  const h = Math.max(0, y1 - y0 - (k < downs.length - 1 ? GAP : 0));
                  return <path key={s.key} d={barPath(x, y0, barW, h, false, k === downs.length - 1)} fill={s.color} />;
                })}
                {/* Zona de hover más grande que la barra */}
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}

          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke={c.borderStrong} strokeWidth={1.5} />

          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={xMid(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={c.textSecondary}>
                {l}
              </text>
            ) : null
          )}
        </svg>

        {hover !== null && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: 8,
              left: Math.min(Math.max(xMid(hover) + barW / 2 + 8, 0), width - 230),
              p: 1.25,
              minWidth: 210,
              pointerEvents: "none",
            }}
          >
            <Typography variant="caption" fontWeight={600} sx={{ textTransform: "capitalize" }}>
              {labels[hover]}
            </Typography>
            {totals && totalLabel && (
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  {totalLabel}
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={amountSx}>
                  {formatValue(totals[hover] ?? 0)}
                </Typography>
              </Stack>
            )}
            {[...segments].reverse().map((s) => (
              <Stack key={s.key} direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: s.color }} />
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Stack>
                <Typography variant="caption" fontWeight={600} sx={amountSx}>
                  {formatValue(s.values[hover] ?? 0)}
                </Typography>
              </Stack>
            ))}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
