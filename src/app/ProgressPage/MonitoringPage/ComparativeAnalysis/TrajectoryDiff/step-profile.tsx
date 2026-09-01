import { useMemo, useState } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import type { Observation } from '../../../../../shared/models/observability/observation';
import { durationOf, formatMs, isErrorLevel, prettyName, tokensOf } from '../../../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import SegmentedToggle from '../../../../../shared/components/segmented-toggle';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Deliberately run-level, not question-level: every observation across every
// session a run has (whatever the prompt was) rolls up into one row per step
// name. Answers "which step is slow / expensive / error-prone in this run",
// a question alignByQuestion can't answer once prompts stop matching exactly.

interface Props {
  detailsByRun: Record<string, TraceDetail[]>
  runIds: string[]
  runNameById: Record<string, string>
  colorById: Record<string, string>
  baselineId: string
}

interface StepAgg {
  name: string
  count: number
  avgMs: number
  avgTokens: number | null
  errorRate: number
}

type Metric = 'count' | 'avgMs' | 'avgTokens';

const aggregateSteps = (traces: TraceDetail[]): Record<string, StepAgg> => {
  const acc: Record<string, { totalMs: number; count: number; totalTokens: number; tokenCount: number; errorCount: number }> = {};

  traces.forEach(t => {
    t.observations.forEach((o: Observation) => {
      const name = prettyName(o.name);

      if (!acc[name]) acc[name] = { totalMs: 0, count: 0, totalTokens: 0, tokenCount: 0, errorCount: 0 };
      acc[name].totalMs += durationOf(o);
      acc[name].count += 1;

      const tok = tokensOf(o);

      if (typeof tok === 'number') {
        acc[name].totalTokens += tok;
        acc[name].tokenCount += 1;
      }
      if (isErrorLevel(o)) acc[name].errorCount += 1;
    });
  });

  return Object.fromEntries(
    Object.entries(acc).map(([name, a]) => [name, {
      name,
      count: a.count,
      avgMs: a.count ? a.totalMs / a.count : 0,
      avgTokens: a.tokenCount ? a.totalTokens / a.tokenCount : null,
      errorRate: a.count ? a.errorCount / a.count : 0,
    }]),
  );
};

const metricOptions: Array<{ value: Metric; label: string }> = [
  { value: 'count', label: 'Calls' },
  { value: 'avgMs', label: 'Avg Duration' },
  { value: 'avgTokens', label: 'Avg Tokens' },
];

const formatMetric = (metric: Metric, agg: StepAgg | undefined) => {
  if (!agg) return '—';
  if (metric === 'count') return String(agg.count);
  if (metric === 'avgMs') return formatMs(agg.avgMs);

  return agg.avgTokens === null ? '—' : Math.round(agg.avgTokens).toLocaleString();
};

const metricValue = (metric: Metric, agg: StepAgg | undefined): number | null => {
  if (!agg) return null;
  if (metric === 'count') return agg.count;
  if (metric === 'avgMs') return agg.avgMs;

  return agg.avgTokens;
};

const StepProfile = ({ detailsByRun, runIds, runNameById, colorById, baselineId }: Props) => {
  const theme = useTheme();
  const [metric, setMetric] = useState<Metric>('avgMs');

  const aggByRun = useMemo(
    () => Object.fromEntries(runIds.map(id => [id, aggregateSteps(detailsByRun[id] ?? [])])),
    [runIds, detailsByRun],
  );

  const stepNames = useMemo(() => {
    const names = new Set<string>();

    runIds.forEach(id => Object.keys(aggByRun[id] ?? {}).forEach(n => names.add(n)));

    const totalCalls = (name: string) => runIds.reduce((sum, id) => sum + (aggByRun[id]?.[name]?.count ?? 0), 0);

    return Array.from(names).sort((a, b) => totalCalls(b) - totalCalls(a));
  }, [runIds, aggByRun]);

  const hasAny = runIds.some(id => (detailsByRun[id]?.length ?? 0) > 0);

  if (!hasAny) {
    return (
      <InfoMessage
        message="No sessions recorded for the selected runs."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  return (
    <ResponsiveCardTable
      title="Step Profile"
      details={`aggregated across all sessions per run · ${runIds.length} runs`}
      headerActions={
        <SegmentedToggle
          uppercase
          aria-label="step profile metric"
          value={metric}
          onChange={(v) => setMetric(v as Metric)}
          options={metricOptions.map(o => ({ value: o.value, label: o.label }))}
        />
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `220px repeat(${runIds.length}, minmax(110px, 1fr))`, gap: 0 }}>
          {/* header row */}
          <Box sx={{ py: 0.75, px: 1, borderBottom: `1px solid ${theme.palette.divider}` }} />
          {runIds.map(id => (
            <Box
              key={id}
              sx={{
                py: 0.75,
                px: 1,
                borderBottom: `2px solid ${colorById[id]}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colorById[id], flexShrink: 0 }} />
              <Typography
                variant="statLabel"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={id}
              >
                {runNameById[id] ?? id}
                {id === baselineId ? ' (baseline)' : ''}
              </Typography>
            </Box>
          ))}

          {/* rows */}
          {stepNames.map(name => {
            const baselineAgg = aggByRun[baselineId]?.[name];
            const baselineVal = metricValue(metric, baselineAgg);

            return (
              <Box key={name} sx={{ display: 'contents' }}>
                <Box
                  sx={{
                    py: 0.6,
                    px: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="bodySm" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>
                    {name}
                  </Typography>
                </Box>
                {runIds.map(id => {
                  const agg = aggByRun[id]?.[name];
                  const val = metricValue(metric, agg);
                  const delta = val !== null && baselineVal !== null && id !== baselineId
                    ? val - baselineVal
                    : null;
                  // For duration/tokens, lower is better (green); for call count, a
                  // higher/lower delta isn't inherently good or bad, so it's shown
                  // neutrally.
                  const deltaColor = delta === null || metric === 'count'
                    ? theme.palette.text.secondary
                    : delta > 0 ? theme.palette.error.main : theme.palette.success.main;

                  return (
                    <Box
                      key={id}
                      sx={{
                        py: 0.6,
                        px: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        bgcolor: agg ? alpha(colorById[id], 0.03) : 'transparent',
                      }}
                    >
                      <Typography variant="bodySm" sx={{ fontWeight: 600 }}>
                        {formatMetric(metric, agg)}
                      </Typography>
                      {delta !== null && delta !== 0 && (
                        <Typography variant="statLabel" sx={{ fontWeight: 500, color: deltaColor, fontSize: '0.62rem' }}>
                          {delta > 0 ? '+' : ''}
                          {metric === 'avgMs' ? formatMs(delta) : Math.round(delta).toLocaleString()}
                        </Typography>
                      )}
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
};

export default StepProfile;
