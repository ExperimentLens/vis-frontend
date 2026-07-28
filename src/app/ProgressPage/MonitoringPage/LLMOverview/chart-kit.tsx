import { useMemo } from 'react';
import { Box, Paper, Stack, Typography, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { Handler } from 'vega-tooltip';
import { cardSurfaceSx, cardHeaderSx } from '../../../../shared/styles/card-surface';
import { MONO } from '../../../../shared/models/observability/agentic-conventions';

/** Shared Vega tooltip handler (stringifies values, themed via global CSS). */
export const useVegaTooltip = () => useMemo(() => new Handler({ sanitize: (v: unknown) => String(v) }).call, []);

/** Theme-aware Vega-Lite config so the plain ResponsiveVegaLite reads in dark mode. */
export const useVegaThemeConfig = () => {
  const theme = useTheme();
  const muted = theme.palette.text.secondary;
  const grid = theme.palette.divider;

  return {
    background: 'transparent',
    axis: {
      labelColor: muted,
      titleColor: muted,
      gridColor: grid,
      domainColor: grid,
      tickColor: grid,
      labelFontSize: 10,
      titleFontSize: 11,
      labelLimit: 140,
    },
    legend: { labelColor: muted, titleColor: muted, labelFontSize: 10, titleFontSize: 10 },
    view: { stroke: 'transparent' },
  };
};

/** Map a 0..1 ratio to success/warning/error (invert for latency-style metrics). */
export const numericColor = (value: number, theme: Theme, invert = false) => {
  const v = invert ? 1 - value : value;

  if (v >= 0.75) return theme.palette.success.main;
  if (v >= 0.5) return theme.palette.warning.main;

  return theme.palette.error.main;
};

export const Bar = ({ value, color, width = 60 }: { value: number; color: string; width?: number }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width, height: 6, borderRadius: 999, bgcolor: theme.palette.customSurface.barTrack, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height: '100%', bgcolor: color }} />
      </Box>
      <Typography variant="caption" sx={{ fontFamily: MONO, minWidth: 34 }}>
        {(value * 100).toFixed(0)}%
      </Typography>
    </Box>
  );
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  minHeight?: number;
}

export const ChartCard = ({ title, subtitle, action, children, minHeight }: ChartCardProps) => (
  <Paper elevation={0} sx={[cardSurfaceSx(), { display: 'flex', flexDirection: 'column', minHeight }]}>
    <Box sx={cardHeaderSx()}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{subtitle}</Typography>
      )}
      {action && <Box sx={{ ml: 'auto' }}>{action}</Box>}
    </Box>
    <Box sx={{ p: 1.5, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
  </Paper>
);

export const EmptyNote = ({ children }: { children: React.ReactNode }) => (
  <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 3 }}>
    <Typography variant="caption" color="text.secondary">{children}</Typography>
  </Stack>
);
