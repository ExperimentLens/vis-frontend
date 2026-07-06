import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { api } from '../../api/api';
import type { ReplayResult } from '../../../shared/models/observability/replay';
import { asText } from '../../../shared/models/observability/agentic-conventions';
import { CodeBlock, MetaChip, SectionLabel } from './trace-ui';

type CounterfactualReplayPanelProps = {
  traceId: string;
  observationId: string;
  prompt: string;
};

const diffColor = (theme: Theme, ratio: number) => {
  if (ratio < 0.15) return theme.palette.success.main;
  if (ratio < 0.4) return theme.palette.warning.main;
  return theme.palette.error.main;
};

const CounterfactualReplayPanel = ({ traceId, observationId, prompt }: CounterfactualReplayPanelProps) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplayResult | null>(null);

  const handleToggle = () => {
    setOpen(o => !o);
    if (!open && !editedPrompt) setEditedPrompt(prompt);
  };

  const handleReplay = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<ReplayResult>(
        `/observability/traces/${traceId}/counterfactual`,
        { observationId, overrides: { prompt: editedPrompt } },
      );
      setResult(response.data);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? 'Failed to run counterfactual replay.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small"
        variant={open ? 'contained' : 'outlined'}
        startIcon={<ReplayRoundedIcon sx={{ fontSize: 15 }} />}
        onClick={handleToggle}
        sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.25 }}
      >
        Counterfactual replay
      </Button>

      {open && (
        <Box
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.customSurface.tray,
          }}
        >
          <SectionLabel>Edit prompt and replay</SectionLabel>
          <TextField
            multiline
            fullWidth
            minRows={4}
            maxRows={12}
            value={editedPrompt}
            onChange={e => setEditedPrompt(e.target.value)}
            sx={{ mb: 1, '& textarea': { fontFamily: 'inherit', fontSize: '0.72rem' } }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="contained"
              disabled={loading || !editedPrompt.trim()}
              onClick={handleReplay}
              startIcon={loading ? <CircularProgress size={13} color="inherit" /> : undefined}
              sx={{ textTransform: 'none' }}
            >
              {loading ? 'Replaying…' : 'Run'}
            </Button>
            {result && <MetaChip label="diff" value={result.diffRatio.toFixed(2)} />}
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 1, py: 0, fontSize: '0.72rem' }}>
              {error}
            </Alert>
          )}

          {result && !error && (
            <Box
              sx={{
                mt: 1.25,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
                gap: 1.25,
              }}
            >
              <Box>
                <SectionLabel>Original output</SectionLabel>
                <CodeBlock maxHeight={200}>{asText(result.originalOutput)}</CodeBlock>
              </Box>
              <Box>
                <SectionLabel>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Counterfactual output
                    </Typography>
                  </Stack>
                </SectionLabel>
                <Box
                  sx={{
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(diffColor(theme, result.diffRatio), 0.5)}`,
                  }}
                >
                  <CodeBlock maxHeight={200}>{asText(result.newOutput)}</CodeBlock>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CounterfactualReplayPanel;
