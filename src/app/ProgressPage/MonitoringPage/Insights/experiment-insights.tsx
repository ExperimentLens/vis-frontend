import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Grid, Stack, Typography } from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import InfoMessage from '../../../../shared/components/InfoMessage';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import StatTile from '../../../../shared/components/stat-tile';
import {
  collapseAliasedParams,
  comparableMetrics,
  compareParamValues,
  formatStat,
  inferDirection,
  rankParamImpact,
  varyingParams,
} from '../../../../shared/utils/run-statistics';
import type { Direction, RunRecord } from '../../../../shared/utils/run-statistics';
import { DIRECTION_OPTIONS } from './direction-options';
import ParamComparisonCard from './param-comparison-card';
import ParamImpactCard from './param-impact-card';
import TradeoffCard from './tradeoff-card';
import { useInsightRecords } from './use-insight-records';

const valuesOf = (records: RunRecord[], metric: string) =>
  records.map(r => r.metrics[metric]).filter((v): v is number => v !== undefined);

/** Default focus: the first quality-style (higher-is-better) metric that actually varies. */
const pickDefaultMetric = (records: RunRecord[], metrics: string[]) =>
  metrics.find(m => inferDirection(m) === 'maximize' && new Set(valuesOf(records, m)).size > 1)
  ?? metrics.find(m => new Set(valuesOf(records, m)).size > 1)
  ?? metrics[0]
  ?? '';

/** Default trade-off axis: a varying metric pulling the other way, e.g. latency against quality. */
const pickTradeoffMetric = (records: RunRecord[], metrics: string[], focus: string) => {
  const others = metrics.filter(m => m !== focus);
  const varies = (m: string) => new Set(valuesOf(records, m)).size > 1;

  return others.find(m => varies(m) && inferDirection(m) !== inferDirection(focus))
    ?? others.find(varies)
    ?? others[0]
    ?? '';
};

export default function ExperimentInsights() {
  const { records, completedTotal, filtered } = useInsightRecords();

  const metrics = useMemo(() => comparableMetrics(records), [records]);
  const { params, aliases } = useMemo(() => collapseAliasedParams(records, varyingParams(records)), [records]);

  const [metric, setMetric] = useState('');
  const [directionOverride, setDirectionOverride] = useState<Partial<Record<string, Direction>>>({});
  const [param, setParam] = useState('');
  const [xMetric, setXMetric] = useState('');

  // Re-pick defaults whenever the available metrics change (new experiment, new filters).
  useEffect(() => {
    if (!metrics.includes(metric)) setMetric(pickDefaultMetric(records, metrics));
  }, [metrics]);

  useEffect(() => {
    if (!metrics.includes(xMetric) || xMetric === metric) setXMetric(pickTradeoffMetric(records, metrics, metric));
  }, [metrics, metric]);

  const directionOf = (m: string): Direction => directionOverride[m] ?? inferDirection(m);
  const direction = directionOf(metric);

  const impacts = useMemo(
    () => (metric ? rankParamImpact(records, params, metric) : []),
    [records, params, metric],
  );

  useEffect(() => {
    if (!impacts.some(i => i.param === param)) setParam(impacts[0]?.param ?? '');
  }, [impacts]);

  const groups = useMemo(
    () => (metric && param ? compareParamValues(records, param, metric, direction) : []),
    [records, param, metric, direction],
  );

  if (records.length < 2 || metrics.length === 0) {
    return (
      <Box sx={{ height: 360 }}>
        <InfoMessage
          type="info"
          fullHeight
          icon={<InsightsRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          message={
            filtered
              ? 'Fewer than two completed runs match the runs table filters. Clear some filters to see insights.'
              : 'Insights need at least two completed runs that logged the same metric.'
          }
        />
      </Box>
    );
  }

  const metricValues = valuesOf(records, metric);
  const metricIsFlat = metricValues.length > 1 && new Set(metricValues).size === 1;
  const nothingReplicated = impacts.length > 0 && impacts.every(i => !i.replicated);
  const strongest = impacts[0];
  const best = groups[0];

  return (
    <Stack spacing={1.5} sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Box sx={{ minWidth: 220 }}>
          <SearchableSelect
            labelId="insights-metric"
            inputLabel="Metric"
            label="Metric"
            value={metric}
            options={metrics}
            onChange={setMetric}
            menuMaxHeight={300}
          />
        </Box>
        <SegmentedToggle
          size="small"
          value={direction}
          onChange={value => setDirectionOverride(prev => ({ ...prev, [metric]: value as Direction }))}
          options={DIRECTION_OPTIONS}
          aria-label={`Whether higher or lower ${metric} is better`}
        />
        <Box sx={{ flex: 1 }} />
        <Chip
          size="small"
          variant="outlined"
          label={
            filtered
              ? `${records.length} of ${completedTotal} completed runs (runs table filters applied)`
              : `${records.length} completed runs`
          }
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <StatTile icon={<ScienceRoundedIcon fontSize="small" />} label="Runs analysed" value={String(records.length)} />
        <StatTile
          icon={<TuneRoundedIcon fontSize="small" />}
          label="Params varied"
          value={String(params.length)}
          sub={params.slice(0, 3).join(', ') + (params.length > 3 ? '…' : '')}
        />
        <StatTile
          icon={<InsightsRoundedIcon fontSize="small" />}
          label="Strongest driver"
          value={strongest && strongest.etaSquared > 0 ? strongest.param : '—'}
          sub={strongest && strongest.etaSquared > 0 ? `explains ${Math.round(strongest.etaSquared * 100)}% of ${metric}` : undefined}
          tone={strongest && strongest.p !== null && strongest.p < 0.05 ? 'success' : 'default'}
        />
        <StatTile
          icon={<EmojiEventsRoundedIcon fontSize="small" />}
          label={param ? `Best ${param}` : 'Best value'}
          value={best && !metricIsFlat ? best.value : '—'}
          sub={best && !metricIsFlat ? `${metric} ${formatStat(best.mean)}` : undefined}
          tone="success"
        />
      </Stack>

      {metricIsFlat && (
        <Alert severity="info">
          Every run scored exactly <strong>{formatStat(metricValues[0])}</strong> on <strong>{metric}</strong>, so no
          param changed it. Widen the param ranges, use a harder dataset, or pick another metric.
        </Alert>
      )}
      {nothingReplicated && !metricIsFlat && (
        <Alert severity="warning">
          Each configuration ran only once, so differences can&apos;t be told apart from run-to-run noise. Repeat each
          configuration a few times (for example <code>run_experiment(..., repeats=5)</code> in the ExperimentLens SDK)
          to get confidence intervals and significance tests.
        </Alert>
      )}

      {params.length === 0 ? (
        <Alert severity="info">
          All runs used the same params, so there is nothing to attribute {metric} to. Vary at least one param to see
          what drives it.
        </Alert>
      ) : (
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, xl: 5 }}>
            <ParamImpactCard
              metric={metric}
              impacts={impacts}
              aliases={aliases}
              selectedParam={param}
              onSelectParam={setParam}
            />
          </Grid>
          <Grid size={{ xs: 12, xl: 7 }}>
            {groups.length > 0 && (
              <ParamComparisonCard param={param} metric={metric} direction={direction} groups={groups} />
            )}
          </Grid>
        </Grid>
      )}

      {metrics.length >= 2 && xMetric && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Trade-offs</Typography>
          <TradeoffCard
            records={records}
            metrics={metrics}
            yMetric={metric}
            yDirection={direction}
            xMetric={xMetric}
            xDirection={directionOf(xMetric)}
            onXMetricChange={setXMetric}
            onXDirectionChange={value => setDirectionOverride(prev => ({ ...prev, [xMetric]: value }))}
          />
        </Box>
      )}
    </Stack>
  );
}
