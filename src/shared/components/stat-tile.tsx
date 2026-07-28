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
}

const StatTile = ({ icon, label, value, sub, tone = 'default' }: StatTileProps) => {
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
      <Typography variant="statValue" sx={{ color }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="bodySm" sx={{ color: 'text.secondary', fontSize: '0.58rem', display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
};

export default StatTile;
