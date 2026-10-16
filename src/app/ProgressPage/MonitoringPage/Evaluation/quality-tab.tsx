import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import SearchableSelect from '../../../../shared/components/searchable-select';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import {
  compareToBaseline,
  evalMetrics,
  evalName,
  groupingParams,
  scoresByGroup,
  scoresOverTime,
} from '../../../../shared/utils/eval-quality';
import { useInsightRecords } from '../Insights/use-insight-records';
import DetectIssuesPanel from '../LLMOverview/detect-issues-panel';
import VerdictPassRateChart from '../LLMOverview/verdict-passrate-chart';
import BaselineComparisonCard from './baseline-comparison-card';
import EvalHeatmapCard from './eval-heatmap-card';
import ScoresOverTimeCard from './scores-over-time-card';
import TraceScoresCard from './trace-scores-card';
import { useOpenTraces } from '../Traces/use-open-traces';
import type { TraceScoreSummary } from './trace-scores-card';

/** Operational metrics worth checking for regressions next to the eval scores. */
const COST_METRICS = ['latency_ms', 'cost_usd', 'total_tokens'];

/** A user's pick while it is still available, otherwise the data's default. */
const pick = (chosen: string, options: string[]) => (options.includes(chosen) ? chosen : options[0] ?? '');

interface Props {
  /** Langfuse traces of the experiment's sessions; the judge, issue and score views read these. */
  details: TraceDetail[];
  tracesLoading: boolean;
  scores: TraceScoreSummary[];
  totalScores: number;
  onDownloadScoresCsv: () => void;
  runNameById: Record<string, string>;
}

/**
 * Everything about output quality in one place: eval scores per configuration (from
 * MLflow run metrics, so they show immediately), the baseline comparison and trend,
 * then the trace-level judges, issue scan and raw scores once traces have loaded.
 */
export default function QualityTab({ details, tracesLoading, scores, totalScores, onDownloadScoresCsv, runNameById }: Props) {
  const { records } = useInsightRecords();
  const openTraces = useOpenTraces();
  const workflows = useAppSelector((s: RootState) => s.progressPage.workflows.data);

  const metrics = useMemo(() => evalMetrics(records), [records]);
  const params = useMemo(() => groupingParams(records), [records]);
  const startTimeById = useMemo(() => Object.fromEntries(workflows.map(w => [w.id, w.startTime])), [workflows]);

  // Only explicit choices are stored, so the defaults keep following the data while
  // runs are still arriving.
  const [chosenParam, setChosenParam] = useState('');
  const [chosenBaseline, setChosenBaseline] = useState('');
  const [chosenMetric, setChosenMetric] = useState('');
  const [showRawScores, setShowRawScores] = useState(false);

  const param = pick(chosenParam, params);
  const timeMetric = pick(chosenMetric, metrics);

  const scoreRows = useMemo(() => scoresByGroup(records, param, metrics), [records, param, metrics]);
  const groups = useMemo(() => scoreRows.map(r => r.group).sort(), [scoreRows]);
  const baseline = pick(chosenBaseline, groups.includes('baseline') ? ['baseline', ...groups] : groups);

  const comparedMetrics = useMemo(
    () => [...metrics, ...COST_METRICS.filter(m => records.some(r => r.metrics[m] !== undefined))],
    [metrics, records],
  );

  const candidates = useMemo(
    () => groups
      .filter(g => g !== baseline)
      .map(group => ({ group, changes: compareToBaseline(records, param, baseline, group, comparedMetrics) })),
    [groups, baseline, records, param, comparedMetrics],
  );

  const points = useMemo(
    () => (timeMetric ? scoresOverTime(records, startTimeById, param, timeMetric) : []),
    [records, startTimeById, param, timeMetric],
  );

  const hasEvals = metrics.length > 0;
  const hasTraces = details.length > 0;

  const openCellTraces = useCallback((group: string, metric: string, mean: number) => openTraces({
    // Traces filter by variant, so other groupings open every variant.
    ...(param === 'variant' ? { variants: [group] } : {}),
    // A cell below 1 opens the traces that failed this check; a perfect one opens all of them.
    ...(mean < 1 ? { status: 'failing' as const, check: evalName(metric).replace(/_/g, ' ') } : {}),
  }), [openTraces, param]);

  return (
    <Grid container spacing={1.5} sx={{ pb: 1.5, flexShrink: 0 }}>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {hasEvals && params.length > 0 && (
            <Box sx={{ width: 220 }}>
              <SearchableSelect
                labelId="quality-group-by"
                inputLabel="Group runs by"
                label="Group runs by"
                value={param}
                options={params}
                onChange={setChosenParam}
                menuMaxHeight={300}
              />
            </Box>
          )}
          <Box sx={{ flex: 1 }} />
          {tracesLoading && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CircularProgress size={12} />
              <Typography variant="caption" color="text.secondary">Loading traces…</Typography>
            </Stack>
          )}
        </Stack>
      </Grid>

      {!hasEvals && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            No evaluation scores on these runs. Score each run with <code>ctx.evaluate([...])</code> in the ExperimentLens
            SDK (0.3+), for example faithfulness, answer_relevance, toxicity or pii_leakage, to get the score heatmap,
            baseline comparison and trend here.
          </Alert>
        </Grid>
      )}

      {hasEvals && (
        <>
          <Grid size={{ xs: 12 }}>
            <EvalHeatmapCard
              rows={scoreRows}
              metrics={metrics}
              param={param}
              onCellClick={hasTraces ? openCellTraces : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <BaselineComparisonCard
              param={param}
              groups={groups}
              baseline={baseline}
              onBaselineChange={setChosenBaseline}
              candidates={candidates}
              metrics={comparedMetrics}
            />
          </Grid>
        </>
      )}

      {hasEvals && (
        <Grid size={{ xs: 12, lg: hasTraces ? 6 : 12 }}>
          <ScoresOverTimeCard points={points} metrics={metrics} metric={timeMetric} onMetricChange={setChosenMetric} param={param} />
        </Grid>
      )}
      {hasTraces && (
        <Grid size={{ xs: 12, lg: hasEvals ? 6 : 12 }} sx={{ textAlign: 'left' }}>
          <VerdictPassRateChart details={details} />
        </Grid>
      )}

      {hasTraces && (
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
          <DetectIssuesPanel details={details} runNameById={runNameById} />
        </Grid>
      )}

      {hasTraces && (
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
          <Button
            size="small"
            onClick={() => setShowRawScores(v => !v)}
            startIcon={showRawScores ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          >
            {showRawScores ? 'Hide raw trace scores' : `Show raw trace scores (${totalScores.toLocaleString()})`}
          </Button>
          {showRawScores && (
            <Box sx={{ mt: 1 }}>
              <TraceScoresCard scores={scores} totalScores={totalScores} onDownload={onDownloadScoresCsv} />
            </Box>
          )}
        </Grid>
      )}
    </Grid>
  );
}
