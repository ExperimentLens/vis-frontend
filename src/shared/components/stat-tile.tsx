import { Box, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import { MONO } from '../models/observability/agentic-conventions';

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
}

const StatTile = ({ icon, label, value, sub, tone = 'default' }: StatTileProps) => {
  const color = useToneColor(tone);

  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 96px',
        minWidth: 96,
        p: 1,
        borderRadius: 2,
        background: alpha(color, 0.06),
        border: `1px solid ${alpha(color, 0.18)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
        <Box sx={{ color, display: 'inline-flex' }}>{icon}</Box>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'text.secondary', fontSize: '0.58rem' }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ fontWeight: 700, fontFamily: MONO, fontSize: '1rem', color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.58rem', display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
};

export default StatTile;
