import { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, Paper, Stack, Typography, useTheme } from "@mui/material";
import { amountSx } from "../brand/theme";
import { formatCompact, niceScale } from "../utils/format";

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

interface Props {
  series: Series[];
  labels: string[];
  formatValue: (v: number) => string;
  locale: string;
  height?: number;
  /** Índice destacado con línea vertical (mes actual) */
  markerIndex?: number;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  ariaLabel: string;
  toggleLabel?: (name: string) => string;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

/*
 * Gráfico de líneas accesible (skill dataviz): líneas de 2 px, una sola escala Y,
 * leyenda siempre presente con 2+ series, crosshair + tooltip al pasar, grilla tenue,
 * textos en tokens de texto (no en el color de la serie).
 */
export function LineChart({
  series,
  labels,
  formatValue,
  locale,
  height = 280,
  markerIndex,
  selectedIndex = null,
  onSelect,
  ariaLabel,
  toggleLabel,
}: Props) {
  const theme = useTheme();
  const c = theme.palette.brandTokens;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = series.filter((s) => !hidden[s.key]);
  const all = visible.flatMap((s) => s.values);
  const integer = all.every((v) => Number.isInteger(v));
  const { min, max, ticks } = niceScale(Math.min(...all, 0), Math.max(...all, 0), 4, integer);

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = labels.length;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * innerH;
  const labelEvery = width < 520 ? 3 : width < 760 ? 2 : 1;

  const indexFromEvent = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const rel = clientX - rect.left - PAD.left;
    return Math.min(n - 1, Math.max(0, Math.round((rel / innerW) * (n - 1))));
  };

  const active = hover ?? selectedIndex;

  return (
    <Box>
      {series.length > 1 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }} role="group" aria-label="Leyenda">
          {series.map((s) => (
            <ButtonBase
              key={s.key}
              onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
              aria-pressed={!hidden[s.key]}
              aria-label={toggleLabel ? toggleLabel(s.label) : s.label}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.25,
                minHeight: 32,
                borderRadius: "8px",
                border: `1px solid ${c.border}`,
                opacity: hidden[s.key] ? 0.45 : 1,
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 16,
                  height: 0,
                  borderTop: `2px ${s.dashed ? "dashed" : "solid"} ${s.color}`,
                }}
              />
              {s.label}
            </ButtonBase>
          ))}
        </Stack>
      )}

      <Box ref={ref} sx={{ position: "relative", width: "100%" }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          style={{ display: "block", cursor: onSelect ? "pointer" : "default", touchAction: "pan-y" }}
          onMouseMove={(e) => setHover(indexFromEvent(e.clientX))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => onSelect?.(indexFromEvent(e.clientX))}
        >
          {ticks.map((tk, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tk)} y2={y(tk)} stroke={c.border} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tk)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={c.textMuted}>
                {formatCompact(tk, locale)}
              </text>
            </g>
          ))}
          {min < 0 && <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke={c.borderStrong} strokeWidth={1.5} />}

          {markerIndex !== undefined && (
            <line x1={x(markerIndex)} x2={x(markerIndex)} y1={PAD.top} y2={PAD.top + innerH} stroke={c.borderStrong} strokeDasharray="4 4" />
          )}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke={c.textMuted} strokeWidth={1} />
          )}

          {visible.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "6 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
          ))}

          {/* Con un solo punto no hay línea: se marca el punto */}
          {n === 1 &&
            visible.map((s) => <circle key={`one-${s.key}`} cx={x(0)} cy={y(s.values[0] ?? 0)} r={5} fill={s.color} stroke={c.surface} strokeWidth={2} />)}

          {active !== null &&
            visible.map((s) => (
              <circle key={s.key} cx={x(active)} cy={y(s.values[active] ?? 0)} r={5} fill={s.color} stroke={c.surface} strokeWidth={2} />
            ))}

          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={c.textSecondary}>
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
              left: Math.min(Math.max(x(hover) + 12, 0), width - 200),
              p: 1.25,
              minWidth: 180,
              pointerEvents: "none",
            }}
          >
            <Typography variant="caption" fontWeight={600} sx={{ textTransform: "capitalize" }}>
              {labels[hover]}
            </Typography>
            {visible.map((s) => (
              <Stack key={s.key} direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color }} />
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
