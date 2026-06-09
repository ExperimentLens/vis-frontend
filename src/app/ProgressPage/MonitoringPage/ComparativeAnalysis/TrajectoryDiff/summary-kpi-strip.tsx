import { Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import { MONO, formatMs } from '../../../../../shared/models/observability/agentic-conventions';
import type { ExperimentRollup } from '../../../../../shared/utils/observability-aggregates';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';

type Direction = 'lower' | 'higher' | 'neutral';

const METRICS: ReadonlyArray<{ key: keyof ExperimentRollup; label: string; dir: Direction; fmt: (n: number) => string }> = [
  { key: 'totalCost', label: 'Cost', dir: 'lower', fmt: n => `$${n.toFixed(4)}` },
  { key: 'traceCount', label: 'Traces', dir: 'neutral', fmt: n => String(n) },
  { key: 'p95LatencyMs', label: 'p95 latency', dir: 'lower', fmt: n => formatMs(n) },
  { key: 'checkPassRate', label: 'Check pass', dir: 'higher', fmt: n => `${Math.round(n * 100)}%` },
];

type Props = {
  runIds: string[];
  runNameById: Record<string, string>;
  colorById: Record<string, string>;
  rollups: Record<string, ExperimentRollup>;
  baselineId: string;
};

export default function SummaryKpiStrip({ runIds, runNameById, colorById, rollups, baselineId }: Props) {
  const cols = `minmax(110px, 1fr) repeat(${runIds.length}, minmax(120px, 1fr))`;

  return (
    <ResponsiveCardTable title="Run KPIs" details="Δ vs. baseline" showSettings={false} showFullScreenButton={false} showDownloadButton={false}>
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: cols, gap: 0.5, minWidth: 360, alignItems: 'center' }}>
          <Box />
          {runIds.map(id => (
            <Stack key={id} direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, py: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorById[id], flexShrink: 0 }} />
              <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={runNameById[id] ?? id}>
                {runNameById[id] ?? id}
              </Typography>
              {id === baselineId && <Chip label="base" size="small" sx={{ height: 14, fontSize: '0.5rem' }} />}
            </Stack>
          ))}

          {METRICS.map(m => {
            const base = rollups[baselineId]?.[m.key];
            return (
              <Box key={m.key} sx={{ display: 'contents' }}>
                <Typography variant="caption" sx={{ fontFamily: MONO, color: 'text.secondary', py: 0.5 }}>{m.label}</Typography>
                {runIds.map(id => {
                  const raw = rollups[id]?.[m.key];
                  if (raw === null || raw === undefined) {
                    return <Box key={id} sx={{ color: 'text.disabled', fontSize: '0.72rem', pl: 0.25 }}>—</Box>;
                  }
                  const showDelta = id !== baselineId && typeof base === 'number';
                  return (
                    <Box key={id} sx={{ display: 'flex', alignItems: 'baseline', py: 0.5, minWidth: 0 }}>
                      <Typography component="span" sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '0.78rem' }}>{m.fmt(raw)}</Typography>
                      {showDelta && <Delta delta={raw - base} dir={m.dir} fmt={m.fmt} />}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </ResponsiveCardTable>
  );
}

const Delta = ({ delta, dir, fmt }: { delta: number; dir: Direction; fmt: (n: number) => string }) => {
  const theme = useTheme();
  if (delta === 0) return <Box component="span" sx={{ color: 'text.disabled', ml: 0.5, fontSize: '0.6rem' }}>=</Box>;
  const good = dir === 'lower' ? delta < 0 : dir === 'higher' ? delta > 0 : null;
  const color = good === null ? theme.palette.text.secondary : good ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Box component="span" sx={{ color, ml: 0.5, fontSize: '0.6rem', fontFamily: MONO }}>
      {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))}
    </Box>
  );
};
