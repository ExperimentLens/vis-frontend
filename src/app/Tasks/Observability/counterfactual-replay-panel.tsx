import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';

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

const diffLabel = (ratio: number) => {
  if (ratio < 0.15) return 'Low change';
  if (ratio < 0.4) return 'Medium change';
  return 'High change';
};

const CounterfactualReplayPanel = ({
  traceId,
  observationId,
  prompt,
}: CounterfactualReplayPanelProps) => {
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplayResult | null>(null);

  useEffect(() => {
    setOpen(false);
    setEditedPrompt(prompt);
    setLoading(false);
    setError(null);
    setResult(null);
  }, [traceId, observationId, prompt]);

  const hasChangedPrompt = editedPrompt !== prompt;

  const handleToggle = () => {
    setOpen(o => !o);
    if (!open && !editedPrompt) setEditedPrompt(prompt);
  };

  const handleReset = () => {
    setEditedPrompt(prompt);
    setResult(null);
    setError(null);
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
    <Box
      sx={{
        mt: 1,
        borderRadius: 1.75,
        border: `1px solid ${
          open
            ? alpha(theme.palette.primary.main, 0.45)
            : theme.palette.divider
        }`,
        bgcolor: open ? alpha(theme.palette.primary.main, 0.035) : 'transparent',
        overflow: 'hidden',
        transition: theme.transitions.create(['border-color', 'background-color'], {
          duration: theme.transitions.duration.shortest,
        }),
      }}
    >
      <Button
        fullWidth
        onClick={handleToggle}
        startIcon={<ReplayRoundedIcon sx={{ fontSize: 16 }} />}
        endIcon={
          <KeyboardArrowDownRoundedIcon
            sx={{
              fontSize: 18,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: theme.transitions.create('transform', {
                duration: theme.transitions.duration.shortest,
              }),
            }}
          />
        }
        sx={{
          minHeight: 34,
          px: 1.25,
          py: 0.5,
          justifyContent: 'space-between',
          textTransform: 'none',
          borderRadius: 0,
          color: theme.palette.primary.main,
          bgcolor: open
            ? alpha(theme.palette.primary.main, 0.06)
            : 'transparent',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1)
          },
          '& .MuiButton-startIcon': {
            mr: 0.75,
          },
          '& .MuiButton-endIcon': {
            ml: 'auto',
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ minWidth: 0, flex: 1 }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.2px',
              color: 'inherit',
            }}
          >
            Counterfactual replay
          </Typography>

          {result && (
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: 999,
                fontSize: '0.66rem',
                fontWeight: 800,
                lineHeight: 1.5,
                color: diffColor(theme, result.diffRatio),
                bgcolor: alpha(diffColor(theme, result.diffRatio), 0.12),
                border: `1px solid ${alpha(diffColor(theme, result.diffRatio), 0.25)}`,
              }}
            >
              {diffLabel(result.diffRatio)} · {result.diffRatio.toFixed(2)}
            </Box>
          )}
        </Stack>
      </Button>

      <Collapse in={open} unmountOnExit>
        <Box
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            bgcolor: theme.palette.customSurface.tray,
          }}
        >
          <Box sx={{ p: 1.25 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <SectionLabel>Edit prompt and replay</SectionLabel>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.25,
                    color: theme.palette.text.secondary,
                    fontSize: '0.7rem',
                  }}
                >
                  Change the prompt, run the same observation again, and compare the output.
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.75} alignItems="center">
                {result && <MetaChip label="diff" value={result.diffRatio.toFixed(2)} />}

                <Button
                  size="small"
                  variant="outlined"
                  disabled={loading || !hasChangedPrompt}
                  onClick={handleReset}
                  startIcon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    py: 0.25,
                  }}
                >
                  Reset
                </Button>

                <Button
                  size="small"
                  variant="contained"
                  disabled={loading || !editedPrompt.trim()}
                  onClick={handleReplay}
                  startIcon={
                    loading ? (
                      <CircularProgress size={13} color="inherit" />
                    ) : (
                      <ReplayRoundedIcon sx={{ fontSize: 15 }} />
                    )
                  }
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    py: 0.25,
                    boxShadow: 'none',
                  }}
                >
                  {loading ? 'Replaying…' : 'Run'}
                </Button>
              </Stack>
            </Stack>

            <TextField
              multiline
              fullWidth
              minRows={4}
              maxRows={12}
              value={editedPrompt}
              onChange={e => {
                setEditedPrompt(e.target.value);
                setError(null);
              }}
              placeholder="Edit the prompt used for this observation…"
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  bgcolor: theme.palette.background.paper,
                  fontSize: '0.72rem',
                },
                '& textarea': {
                  fontFamily: 'inherit',
                  fontSize: '0.72rem',
                  lineHeight: 1.55,
                },
              }}
            />

            {error && (
              <Alert
                severity="error"
                sx={{
                  mt: 1,
                  py: 0,
                  fontSize: '0.72rem',
                  borderRadius: 1.5,
                }}
              >
                {error}
              </Alert>
            )}

            {result && !error && (
              <Box
                sx={{
                  mt: 1.25,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1fr) minmax(0, 1fr)',
                  },
                  gap: 1.25,
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    p: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <SectionLabel>Original output</SectionLabel>
                  <CodeBlock maxHeight={220}>
                    {asText(result.originalOutput)}
                  </CodeBlock>
                </Box>

                <Box
                  sx={{
                    minWidth: 0,
                    p: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(diffColor(theme, result.diffRatio), 0.45)}`,
                    bgcolor: alpha(diffColor(theme, result.diffRatio), 0.045),
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 0.5 }}
                  >
                    <SectionLabel>Counterfactual output</SectionLabel>

                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.15,
                        borderRadius: 999,
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: diffColor(theme, result.diffRatio),
                        bgcolor: alpha(diffColor(theme, result.diffRatio), 0.12),
                      }}
                    >
                      {diffLabel(result.diffRatio)}
                    </Box>
                  </Stack>

                  <CodeBlock maxHeight={220}>
                    {asText(result.newOutput)}
                  </CodeBlock>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default CounterfactualReplayPanel;