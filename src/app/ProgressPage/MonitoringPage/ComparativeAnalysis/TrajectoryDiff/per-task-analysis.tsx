import { useMemo, useState } from 'react';
import { Box, Chip, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import { MONO, formatMs } from '../../../../../shared/models/observability/agentic-conventions';
import SegmentedToggle from '../../../../../shared/components/segmented-toggle';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import { colorForType } from '../../../../Tasks/Observability/trace-observation-waterfall';
import { alignTasks } from './trajectory-alignment';
import type { AlignedTaskCell } from './trajectory-alignment';

type Props = {
  byRun: Record<string, TraceDetail>;
  runIds: string[];
  runNameById: Record<string, string>;
  colorById: Record<string, string>;
  baselineId: string;
};

export default function PerTaskAnalysis({ byRun, runIds, runNameById, colorById, baselineId }: Props) {
  const [metric, setMetric] = useState<'duration' | 'tokens'>('duration');
  const [sortMode, setSortMode] = useState<'regression' | 'order'>('regression');

  const tasks = useMemo(() => alignTasks(byRun), [byRun]);

  const valueOf = (cell: AlignedTaskCell | undefined) =>
    cell ? (metric === 'duration' ? cell.durationMs : cell.tokens ?? 0) : null;
  const fmtVal = (n: number) => (metric === 'duration' ? formatMs(n) : Math.round(n).toLocaleString());

  // Biggest regression per task vs. baseline (positive = worse, since both metrics are lower-better).
  const regressionOf = (task: typeof tasks[number]) => {
    const base = valueOf(task.byRun[baselineId]);
    if (base === null) return -Infinity;
    let worst = -Infinity;
    runIds.forEach(id => {
      if (id === baselineId) return;
      const v = valueOf(task.byRun[id]);
      if (v !== null) worst = Math.max(worst, v - base);
    });
    return worst;
  };

  const sortedTasks = useMemo(() => {
    if (sortMode === 'order') return tasks;
    return [...tasks].sort((a, b) => regressionOf(b) - regressionOf(a));
  }, [tasks, sortMode, metric, baselineId, runIds]);

  const topMoverKey = useMemo(() => {
    let key: string | null = null;
    let best = 0;
    tasks.forEach(t => {
      const r = regressionOf(t);
      if (r > best) { best = r; key = t.key; }
    });
    return key;
  }, [tasks, metric, baselineId, runIds]);

  const gridCols = `minmax(150px, 1.4fr) repeat(${runIds.length}, minmax(110px, 1fr))`;

  const handleDownloadCsv = () => {
    if (!sortedTasks.length) return;
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const headers = ['Task', ...runIds.map(id => runNameById[id] ?? id)].map(q);
    const rows = sortedTasks.map(task => {
      const base = valueOf(task.byRun[baselineId]);
      const cells = runIds.map(id => {
        const v = valueOf(task.byRun[id]);
        if (v === null) return '—';
        if (id === baselineId || base === null) return fmtVal(v);
        const d = v - base;
        return `${fmtVal(v)} (${d > 0 ? '+' : '−'}${fmtVal(Math.abs(d))})`;
      });
      return [task.name, ...cells].map(q).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `per-task-${metric}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ResponsiveCardTable
      title="Per-task analysis"
      details="bars share a per-task scale; Δ vs. baseline"
      showSettings={false}
      showFullScreenButton={false}
      showDownloadButton={tasks.length > 0}
      onDownload={handleDownloadCsv}
      downloadLabel="Download as CSV"
      headerActions={
        <Stack direction="row" spacing={0.75}>
          <SegmentedToggle aria-label="metric" value={metric} onChange={v => setMetric(v as 'duration' | 'tokens')} options={[{ value: 'duration', label: 'Duration' }, { value: 'tokens', label: 'Tokens' }]} />
          <SegmentedToggle aria-label="sort" value={sortMode} onChange={v => setSortMode(v as 'regression' | 'order')} options={[{ value: 'regression', label: 'Biggest Δ' }, { value: 'order', label: 'Order' }]} />
        </Stack>
      }
    >
      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gap: 0.5, minWidth: 480, alignItems: 'center' }}>
          <Box />
          {runIds.map(id => <RunHead key={id} id={id} colorById={colorById} runNameById={runNameById} baselineId={baselineId} />)}

          {sortedTasks.map(task => {
            const values = runIds.map(id => valueOf(task.byRun[id]));
            const rowMax = Math.max(1, ...values.filter((v): v is number => v !== null));
            const base = valueOf(task.byRun[baselineId]);
            const isTop = task.key === topMoverKey;

            return (
              <Box key={task.key} sx={{ display: 'contents' }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, py: 0.25 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colorForType(task.type), flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.name}>
                    {task.name}
                  </Typography>
                  {isTop && (
                    <Tooltip title="Biggest regression vs. baseline" arrow>
                      <Chip label="top Δ" size="small" color="error" variant="outlined" sx={{ height: 15, fontSize: '0.5rem', ml: 0.25 }} />
                    </Tooltip>
                  )}
                </Stack>
                {runIds.map((id, i) => {
                  const v = values[i];
                  const color = colorById[id];
                  if (v === null) return <Box key={id} sx={{ color: 'text.disabled', fontSize: '0.7rem', pl: 0.5 }}>—</Box>;
                  const pct = Math.max(3, (v / rowMax) * 100);
                  const delta = id !== baselineId && base !== null ? v - base : null;

                  return (
                    <Box key={id} sx={{ position: 'relative', height: 26, borderRadius: 0.75, bgcolor: alpha(color, 0.1), overflow: 'hidden' }}>
                      <Box sx={{ position: 'absolute', inset: 0, width: `${pct}%`, bgcolor: alpha(color, 0.32) }} />
                      <Stack direction="row" alignItems="center" sx={{ position: 'relative', height: '100%', px: 0.6 }}>
                        <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.62rem', fontWeight: 700 }}>{fmtVal(v)}</Typography>
                        {delta !== null && <Delta delta={delta} fmt={fmtVal} />}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
          {sortedTasks.length === 0 && <Box sx={{ gridColumn: '1 / -1', p: 1 }}><Typography variant="caption" color="text.secondary">No tasks for this question.</Typography></Box>}
        </Box>
      </Box>
    </ResponsiveCardTable>
  );
}

const RunHead = ({
  id,
  colorById,
  runNameById,
  baselineId,
}: {
  id: string;
  colorById: Record<string, string>;
  runNameById: Record<string, string>;
  baselineId: string;
}) => (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, py: 0.5 }}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorById[id], flexShrink: 0 }} />
    <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={runNameById[id] ?? id}>
      {runNameById[id] ?? id}
    </Typography>
    {id === baselineId && <Chip label="base" size="small" sx={{ height: 14, fontSize: '0.5rem' }} />}
  </Stack>
);

const Delta = ({ delta, fmt }: { delta: number; fmt: (n: number) => string }) => {
  const theme = useTheme();
  if (delta === 0) return <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.58rem', ml: 0.5 }}>=</Box>;
  const color = delta < 0 ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Box component="span" sx={{ color, fontFamily: MONO, fontSize: '0.58rem', ml: 0.5 }}>
      {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))}
    </Box>
  );
};
