import { Box, Chip, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import { MONO } from '../../../shared/models/observability/agentic-conventions';
import { MetaChip } from './trace-ui';

type TraceHeaderProps = {
  id: string;
  question: string;
  headerModel?: string;
  configEntries: [string, unknown][];
  tags?: string[];
};

const TraceHeader = ({ id, question, headerModel, configEntries, tags }: TraceHeaderProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        background: theme.palette.customSurface.cardHeader,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: alpha(theme.palette.primary.main, 0.12),
            flexShrink: 0,
            mt: 0.25,
          }}
        >
          <SmartToyRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {question}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO, fontSize: '0.6rem' }}>
            {id}
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}>
            {headerModel && <MetaChip label="model" value={headerModel} />}
            {configEntries.map(([key, value]) => <MetaChip key={key} label={key} value={String(value)} />)}
            {tags?.map(tag => (
              <Chip key={tag} size="small" label={tag} variant="outlined" sx={{ height: 20, fontSize: '0.62rem' }} />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default TraceHeader;
