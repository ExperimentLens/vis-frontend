import { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  Tooltip,
  alpha,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { MOCK_TRACES } from './mock-data';
import type { IAssessment } from './mock-data';

const judgeNames = ['groundedness', 'relevance', 'conciseness'];
const boolScorerNames = ['keyword_presence_scorer', 'exact_match_scorer', 'latency_check_scorer'];
const numericScorerNames = ['response_char_length', 'response_word_count'];

const findAssessment = (assessments: IAssessment[], name: string) =>
  assessments.find(a => a.name === name);

const EvaluationTab = () => {
  const theme = useTheme();
  const [view, setView] = useState<'boolean' | 'numeric'>('boolean');
  const [selected, setSelected] = useState<{
    traceId: string;
    name: string;
  } | null>(null);

  const cols = view === 'boolean' ? [...judgeNames, ...boolScorerNames] : numericScorerNames;
  const rows = MOCK_TRACES;

  const numericRange = useMemo(() => {
    if (view !== 'numeric') return { min: 0, max: 1 };
    const all: number[] = [];
    rows.forEach(r => {
      cols.forEach(c => {
        const a = findAssessment(r.assessments, c);
        if (a && typeof a.value === 'number') all.push(a.value);
      });
    });
    return { min: Math.min(...all, 0), max: Math.max(...all, 1) };
  }, [view, rows, cols]);

  const cellColor = (a: IAssessment | undefined) => {
    if (!a) return theme.palette.action.disabledBackground;
    if (typeof a.value === 'number') {
      const t = (a.value - numericRange.min) / Math.max(1, numericRange.max - numericRange.min);
      return alpha(theme.palette.primary.main, 0.15 + t * 0.55);
    }
    if (a.value === 'yes') return alpha(theme.palette.success.main, 0.55);
    if (a.value === 'no')  return alpha(theme.palette.error.main, 0.55);
    return theme.palette.action.disabledBackground;
  };

  const cellLabel = (a: IAssessment | undefined) => {
    if (!a) return '—';
    if (typeof a.value === 'number') return String(a.value);
    return a.value === 'yes' ? '✓' : '✗';
  };

  const selectedAssessment = selected
    ? findAssessment(
      MOCK_TRACES.find(t => t.id === selected.traceId)?.assessments ?? [],
      selected.name,
    )
    : undefined;

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 1.5, minHeight: 0 }}>
      <Paper
        variant="outlined"
        sx={{ flex: 1, p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Per-example evaluation matrix
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click any cell to see the judge's rationale.
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, v) => v && setView(v)}
            >
              <ToggleButton value="boolean" sx={{ fontSize: '0.7rem' }}>Pass / Fail</ToggleButton>
              <ToggleButton value="numeric" sx={{ fontSize: '0.7rem' }}>Numeric</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>

        <Box sx={{ overflow: 'auto', flex: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `260px repeat(${cols.length}, minmax(110px, 1fr))`,
              gap: 0.5,
              minWidth: 600,
            }}
          >
            <Box />
            {cols.map(c => (
              <Box
                key={c}
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  textAlign: 'center',
                  color: 'text.secondary',
                  py: 0.5,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {c.replace(/_/g, ' ').replace(/scorer$/, '')}
              </Box>
            ))}

            {rows.map(row => (
              <Box key={row.id} sx={{ display: 'contents' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    py: 1,
                    pr: 1,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.78rem',
                    }}
                    title={row.question}
                  >
                    {row.question}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                      fontSize: '0.6rem',
                    }}
                  >
                    {row.runName}
                  </Typography>
                </Box>
                {cols.map(c => {
                  const a = findAssessment(row.assessments, c);
                  const isSelected = selected?.traceId === row.id && selected?.name === c;
                  return (
                    <Tooltip
                      key={c}
                      arrow
                      title={
                        a ? (
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              {c}: {String(a.value)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                              {a.rationale}
                            </Typography>
                          </Box>
                        ) : 'No data'
                      }
                    >
                      <Box
                        onClick={() => setSelected({ traceId: row.id, name: c })}
                        sx={{
                          height: 38,
                          borderRadius: 0.75,
                          bgcolor: cellColor(a),
                          color: theme.palette.text.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          border: isSelected
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                          transition: 'transform 0.12s ease',
                          '&:hover': { transform: 'scale(1.04)' },
                        }}
                      >
                        {cellLabel(a)}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Legend */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
          {view === 'boolean' ? (
            <>
              <LegendChip color={theme.palette.success.main} label="pass" />
              <LegendChip color={theme.palette.error.main} label="fail" />
              <LegendChip color={theme.palette.action.disabledBackground} label="no data" />
            </>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary">
                {numericRange.min}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  maxWidth: 240,
                  height: 8,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.primary.main, 0.7)})`,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {numericRange.max}
              </Typography>
            </>
          )}
        </Stack>
      </Paper>

      {/* Rationale drawer */}
      <Paper
        variant="outlined"
        sx={{
          width: 340,
          flexShrink: 0,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
          Selected assessment
        </Typography>
        {selectedAssessment ? (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
              {selectedAssessment.name}
            </Typography>
            <Box
              sx={{
                display: 'inline-block',
                mt: 0.5,
                px: 0.75,
                py: 0.15,
                borderRadius: 999,
                bgcolor: alpha(
                  selectedAssessment.passed === true ? theme.palette.success.main :
                    selectedAssessment.passed === false ? theme.palette.error.main :
                      theme.palette.primary.main,
                  0.14,
                ),
                color:
                  selectedAssessment.passed === true ? theme.palette.success.main :
                    selectedAssessment.passed === false ? theme.palette.error.main :
                      theme.palette.primary.main,
                fontWeight: 700,
                fontSize: '0.75rem',
                fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              }}
            >
              {String(selectedAssessment.value)}
            </Box>
            <Typography variant="body2" sx={{ mt: 1.5, fontSize: '0.85rem', lineHeight: 1.5 }}>
              {selectedAssessment.rationale}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
            Click a cell in the matrix to inspect the judge or scorer rationale.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

const LegendChip = ({ color, label }: { color: string; label: string }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color }} />
    <Typography variant="caption" sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
  </Stack>
);

export default EvaluationTab;
