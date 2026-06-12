//UNUSED
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { ChartCard, Bar, numericColor, EmptyNote } from './chart-kit';
import { rollup } from '../../../../shared/utils/observability-aggregates';
import { MONO, formatMs } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

interface Props {
  detailsBySession: Record<string, TraceDetail[]>;
  runNameById: Record<string, string>;
  onSelectRun?: (workflowId: string) => void;
}

const Th = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <TableCell align={align} sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary', whiteSpace: 'nowrap', py: 0.75 }}>
    {children}
  </TableCell>
);

const Td = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <TableCell align={align} sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', py: 0.5 }}>
    {children}
  </TableCell>
);

export default function RunLeaderboard({ detailsBySession, runNameById, onSelectRun }: Props) {
  const theme = useTheme();

  const rows = Object.entries(detailsBySession)
    .map(([id, details]) => ({ id, name: runNameById[id] ?? id, ...rollup(details) }))
    .filter(r => r.traceCount > 0)
    .sort((a, b) => (b.judgePassRate ?? -1) - (a.judgePassRate ?? -1) || b.traceCount - a.traceCount);

  const bestId = rows.length && (rows[0].judgePassRate ?? 0) > 0 ? rows[0].id : null;
  const maxTokens = Math.max(1, ...rows.map(r => r.totalTokens));

  return (
    <ChartCard title="Run leaderboard" subtitle={`${rows.length} session${rows.length === 1 ? '' : 's'}`}>
      {rows.length === 0 ? (
        <EmptyNote>No traces aggregated yet.</EmptyNote>
      ) : (
        <Box sx={{ overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <Th>Run</Th>
                <Th align="right">Traces</Th>
                <Th align="right">Avg lat</Th>
                <Th align="right">p95</Th>
                <Th>Tokens</Th>
                <Th align="right">Cost</Th>
                <Th>Judge pass</Th>
                <Th>Checks</Th>
                <Th align="right">Errors</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow
                  key={r.id}
                  hover
                  onClick={() => onSelectRun?.(r.id)}
                  sx={{ cursor: onSelectRun ? 'pointer' : 'default' }}
                >
                  <Td>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption" sx={{ fontFamily: MONO, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }} title={r.name}>
                        {r.name}
                      </Typography>
                      {r.id === bestId && (
                        <Chip size="small" icon={<StarRoundedIcon sx={{ fontSize: 12 }} />} label="Best" color="success" variant="outlined" sx={{ height: 16, fontSize: '0.55rem' }} />
                      )}
                    </Stack>
                  </Td>
                  <Td align="right">{r.traceCount}</Td>
                  <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{formatMs(r.avgLatencyMs)}</Box></Td>
                  <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{formatMs(r.p95LatencyMs)}</Box></Td>
                  <Td><Bar value={r.totalTokens / maxTokens} color={theme.palette.info.main} width={48} /></Td>
                  <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>${r.totalCost.toFixed(4)}</Box></Td>
                  <Td>
                    {r.judgePassRate === null
                      ? <Typography variant="caption" color="text.secondary">—</Typography>
                      : <Bar value={r.judgePassRate} color={numericColor(r.judgePassRate, theme)} width={48} />}
                  </Td>
                  <Td>
                    {r.checkPassRate === null
                      ? <Typography variant="caption" color="text.secondary">—</Typography>
                      : <Bar value={r.checkPassRate} color={numericColor(r.checkPassRate, theme)} width={48} />}
                  </Td>
                  <Td align="right">
                    <Typography variant="caption" sx={{ fontFamily: MONO, color: r.errorRate > 0 ? theme.palette.error.main : 'text.secondary' }}>
                      {Math.round(r.errorRate * 100)}%
                    </Typography>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </ChartCard>
  );
}
