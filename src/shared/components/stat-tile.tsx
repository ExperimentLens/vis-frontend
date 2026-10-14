import { Box, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';

export type Tone = 'default' | 'success' | 'warning' | 'error';

export const useToneColor = (tone: Tone) => {
  const theme = useTheme();
  const map: Record<Tone, string> = {
    default: theme.palette.primary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };

  return map[tone];
};

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  /** Optional values in order (e.g. per run over time), drawn as a sparkline on the right. */
  trend?: number[];
}

const SPARK_W = 72;
const SPARK_H = 26;

/** Minimal line + area sparkline with the last point emphasized; needs two or more values. */
const Sparkline = ({ values, color }: { values: number[]; color: string }) => {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * (SPARK_W - 4) + 2,
    SPARK_H - 3 - ((v - min) / range) * (SPARK_H - 6),
  ]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden style={{ flexShrink: 0 }}>
      <polygon points={`2,${SPARK_H} ${line} ${SPARK_W - 2},${SPARK_H}`} fill={alpha(color, 0.12)} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.2} fill={color} />
    </svg>
  );
};

const StatTile = ({ icon, label, value, sub, tone = 'default', trend }: StatTileProps) => {
  const color = useToneColor(tone);

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        p: 1,
        borderRadius: 2,
        background: alpha(color, 0.06),
        border: `1px solid ${alpha(color, 0.18)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
        <Box sx={{ color, display: 'inline-flex' }}>{icon}</Box>
        <Typography variant="captionLabel" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1}>
        <Typography variant="statValue" sx={{ color }}>
          {value}
        </Typography>
        {trend && trend.length > 1 && <Sparkline values={trend} color={color} />}
      </Stack>
      {sub && (
        <Typography variant="bodySm" sx={{ color: 'text.secondary', fontSize: '0.58rem', display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
};

export default StatTile;
