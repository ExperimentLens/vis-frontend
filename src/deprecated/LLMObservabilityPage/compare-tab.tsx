import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import { MOCK_RUN_SUMMARIES } from './mock-data';
import { cardSurfaceSx } from '../../shared/styles/card-surface';

const numericColor = (value: number, theme: ReturnType<typeof useTheme>, invert = false) => {
  // Map 0..1 → red..green (or inverted for latency-style metrics).
  const v = invert ? 1 - value : value;
  if (v >= 0.75) return theme.palette.success.main;
  if (v >= 0.5) return theme.palette.warning.main;
  return theme.palette.error.main;
};

const Bar = ({ value, color }: { value: number; color: string }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: 60,
          height: 6,
          borderRadius: 999,
          bgcolor: theme.palette.customSurface.barTrack,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${Math.max(0, Math.min(100, value * 100))}%`,
            height: '100%',
            bgcolor: color,
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', minWidth: 36 }}>
        {(value * 100).toFixed(0)}%
      </Typography>
    </Box>
  );
};

const CompareTab = () => {
  const theme = useTheme();

  const maxLatency = Math.max(...MOCK_RUN_SUMMARIES.map(r => r.avgLatencyMs));
  const maxTokens = Math.max(...MOCK_RUN_SUMMARIES.map(r => r.avgTotalTokens));

  const best = [...MOCK_RUN_SUMMARIES].sort((a, b) => b.avgTokenF1 - a.avgTokenF1)[0];

  return (
    <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0, overflow: 'auto' }}>
      <Paper sx={[cardSurfaceSx(), { p: 2 }]}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Run comparison
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {MOCK_RUN_SUMMARIES.length} runs across the RAG × prompt grid.
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main, display: 'block' }}>
                Best F1
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                {best.runName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                F1 {(best.avgTokenF1 * 100).toFixed(0)}% · judges {(best.judgePassRate * 100).toFixed(0)}% · {best.avgLatencyMs}ms
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <Th>Run</Th>
              <Th>RAG</Th>
              <Th>Prompt</Th>
              <Th align="right">Chunk</Th>
              <Th align="right">Top-K</Th>
              <Th align="right">Search</Th>
              <Th>Token F1</Th>
              <Th>Judges</Th>
              <Th>Groundedness</Th>
              <Th>Relevance</Th>
              <Th>Conciseness</Th>
              <Th align="right">Latency</Th>
              <Th align="right">Tokens</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_RUN_SUMMARIES.map(r => (
              <TableRow key={r.runId} hover>
                <Td>
                  <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontWeight: 700 }}>
                    {r.runName}
                  </Typography>
                </Td>
                <Td>{r.ragName}</Td>
                <Td>{r.promptName}</Td>
                <Td align="right">{r.chunkSize}</Td>
                <Td align="right">{r.topK}</Td>
                <Td align="right">{r.searchType}</Td>
                <Td>
                  <Bar value={r.avgTokenF1} color={numericColor(r.avgTokenF1, theme)} />
                </Td>
                <Td>
                  <Bar value={r.judgePassRate} color={numericColor(r.judgePassRate, theme)} />
                </Td>
                <Td>
                  <Bar value={r.avgGroundednessPassed} color={numericColor(r.avgGroundednessPassed, theme)} />
                </Td>
                <Td>
                  <Bar value={r.avgRelevancePassed} color={numericColor(r.avgRelevancePassed, theme)} />
                </Td>
                <Td>
                  <Bar value={r.avgConcisenessPassed} color={numericColor(r.avgConcisenessPassed, theme)} />
                </Td>
                <Td align="right">
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                    <Box
                      sx={{
                        width: 36,
                        height: 6,
                        borderRadius: 999,
                        bgcolor: theme.palette.customSurface.barTrack,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(r.avgLatencyMs / maxLatency) * 100}%`,
                          height: '100%',
                          bgcolor: numericColor(r.avgLatencyMs / maxLatency, theme, true),
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', minWidth: 56 }}>
                      {r.avgLatencyMs}ms
                    </Typography>
                  </Stack>
                </Td>
                <Td align="right">
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                    <Box
                      sx={{
                        width: 36,
                        height: 6,
                        borderRadius: 999,
                        bgcolor: theme.palette.customSurface.barTrack,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(r.avgTotalTokens / maxTokens) * 100}%`,
                          height: '100%',
                          bgcolor: theme.palette.info.main,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', minWidth: 40 }}>
                      {r.avgTotalTokens}
                    </Typography>
                  </Stack>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};

const Th = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <TableCell
    align={align}
    sx={{
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      color: 'text.secondary',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </TableCell>
);

const Td = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <TableCell align={align} sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
    {children}
  </TableCell>
);

export default CompareTab;
