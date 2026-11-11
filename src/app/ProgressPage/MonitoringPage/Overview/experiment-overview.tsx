import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import InfoMessage from '../../../../shared/components/InfoMessage';
import StatTile from '../../../../shared/components/stat-tile';
import type { Tone } from '../../../../shared/components/stat-tile';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import { formatMs } from '../../../../shared/models/observability/agentic-conventions';
import { evalMetrics, groupingParams, scoresByGroup } from '../../../../shared/utils/eval-quality';
import {
  attentionItems,
  passedSafety,
  percentile,
  pickCostMetric,
  QUALITY_SCORE,
  qualitySource,
  seriesOverTime,
  variantMap,
  withQualityScore,
} from '../../../../shared/utils/experiment-overview';
import { collapseAliasedParams, NOT_SET, rankParamImpact, varyingParams } from '../../../../shared/utils/run-statistics';
import { useInsightRecords } from '../Insights/use-insight-records';
import ParamImpactCard from '../Insights/param-impact-card';
import AttentionCard from './attention-card';
import TracesSidePanel from '../Traces/traces-side-panel';
import { useOpenTraces } from '../Traces/use-open-traces';
import { useExperimentCapabilities } from '../../../../shared/utils/experimentCapabilities';
import VariantMapCard from './variant-map-card';
import SettingEffectsCard from './setting-effects-card';
import { passBand } from '../../../../shared/utils/app-settings';
import { caseParam, costMetrics, groupParam, preferredBaseline } from '../../../../shared/utils/experiment-conventions';

/** Fewer runs than this can't support a surrogate model worth plotting. */
const MIN_RUNS_FOR_EFFECTS = 8;


/** Rolling mean so a sparkline over dozens of runs shows the trend, not every wobble. */
const smooth = (values: number[]) => {
  const window = Math.max(1, Math.round(values.length / 10));

  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);

    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
};

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

const qualityTone = (value: number | null): Tone =>
  value === null ? 'default' : ({ good: 'success', warn: 'warning', bad: 'error' } as const)[passBand(value)];

/** Landing view of an experiment: headline numbers, which configuration wins, and what needs a look. */
export default function ExperimentOverview() {
  const { records, startTimeById, unit, loading } = useInsightRecords();
  const workflows = useAppSelector((s: RootState) => s.progressPage.workflows.data);

  const openTraces = useOpenTraces();
  const { traces: hasTraces } = useExperimentCapabilities();
  const scored = useMemo(() => withQualityScore(records), [records]);
  const source = useMemo(() => qualitySource(records), [records]);
  const evals = useMemo(() => evalMetrics(records), [records]);
  const params = useMemo(() => groupingParams(scored), [scored]);
  const param = params[0] ?? '';
  const costMetric = useMemo(() => pickCostMetric(scored), [scored]);

  const groups = useMemo(() => [...new Set(scored.map(r => r.params[param] ?? NOT_SET))].sort(), [scored, param]);
  const baseline = preferredBaseline(groups);

  const attention = useMemo(() => {
    const outcomes = workflows.map(w => ({
      status: w.status,
      params: Object.fromEntries((w.params ?? []).map(p => [p.name, String(p.value)])),
    }));
    const metrics = [...evals, ...costMetrics(m => scored.some(r => r.metrics[m] !== undefined))];

    return attentionItems(outcomes, scored, param, baseline, metrics);
  }, [workflows, scored, param, baseline, evals]);

  // The attention item whose traces are open beside the overview, by title so it survives a recompute.
  const [openTitle, setOpenTitle] = useState<string | null>(null);
  const openItem = attention.find(i => i.title === openTitle) ?? null;
  const closePanel = useCallback(() => setOpenTitle(null), []);
  // Grid breakpoints follow the window, not the space left beside the panel; while it is open
  // the cards are stacked one per row so the charts keep a readable width.

  const points = useMemo(() => (costMetric ? variantMap(scored, param, costMetric) : []), [scored, param, costMetric]);

  const impactParams = useMemo(() => {
    const varying = varyingParams(scored);
    // A variant name only restates the other params; rank it only when nothing else varies.
    const factors = varying.filter(p => p !== groupParam());

    return collapseAliasedParams(scored, factors.length ? factors : varying);
  }, [scored]);
  const impacts = useMemo(() => rankParamImpact(scored, impactParams.params, QUALITY_SCORE), [scored, impactParams]);
  const [impactParam, setImpactParam] = useState('');

  const { experimentId = '' } = useParams();
  // The explainability service fits its surrogate on runs that share one set of param keys, so use the largest such set.
  const effectRuns = useMemo(() => {
    const bySignature = new Map<string, typeof workflows>();

    workflows
      .filter(w => w.status === 'COMPLETED')
      .forEach(w => {
        const signature = (w.params ?? []).map(p => p.name).sort().join('|');

        bySignature.set(signature, [...(bySignature.get(signature) ?? []), w]);
      });

    return [...bySignature.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  }, [workflows]);
  const effectMetrics = useMemo(() => {
    const names = [...new Set(effectRuns.flatMap(w => (w.metrics ?? []).map(m => m.name)))];

    // Eval scores first: they are what a setting is usually tuned for.
    return names.sort((a, b) => Number(!a.startsWith('eval_')) - Number(!b.startsWith('eval_')) || a.localeCompare(b));
  }, [effectRuns]);
  const effectSettings = useMemo(
    () => impactParams.params.filter(p => p !== groupParam() && p !== caseParam()),
    [impactParams],
  );

  if (loading && !records.length) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 6, gap: 1.5 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">Loading the runs&apos; cases…</Typography>
      </Stack>
    );
  }

  if (!records.length) {
    return (
      <InfoMessage
        message="No completed runs yet. The overview fills in as runs finish."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  // The effect curve follows the param picked in "What drives …?", when it is a real setting.
  const pickedParam = impactParam || impacts[0]?.param || '';
  const effectSetting = effectSettings.includes(pickedParam) ? pickedParam : effectSettings[0] ?? '';
  const showEffects =
    Boolean(experimentId) && effectRuns.length >= MIN_RUNS_FOR_EFFECTS && effectSettings.length > 0 && effectMetrics.length > 0;

  // Headline numbers.
  const quality =mean(scored.map(r => r.metrics[QUALITY_SCORE]).filter((v): v is number => v !== undefined));
  const best = scoresByGroup(scored, param, [QUALITY_SCORE]).find(g => g.scores[QUALITY_SCORE]);
  const safety = scored.map(passedSafety).filter((v): v is boolean => v !== null);
  const latencies = scored.map(r => r.metrics.latency_ms).filter((v): v is number => v !== undefined);
  const p95 = percentile(latencies, 95);
  const totalCost = scored.reduce((sum, r) => sum + (r.metrics.cost_usd ?? 0), 0);
  const totalTokens = scored.reduce((sum, r) => sum + (r.metrics.total_tokens ?? 0), 0);
  const finished = workflows.filter(w => w.status !== 'SCHEDULED' && w.status !== 'RUNNING');
  const failed = finished.filter(w => w.status === 'FAILED').length;
  const orderedSafety = scored
    .filter(r => passedSafety(r) !== null)
    .sort((a, b) => (startTimeById[a.id] ?? 0) - (startTimeById[b.id] ?? 0))
    .map(r => Number(passedSafety(r)));

  // Tiles across the top; below them the cards scroll on the left and the traces panel sits beside them, as in the Traces tab.
  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, flexShrink: 0 }}>
        <StatTile
          icon={<EmojiEventsRoundedIcon sx={{ fontSize: 15 }} />}
          label="Quality score"
          value={quality === null ? '—' : `${Math.round(quality * 100)}%`}
          sub={best ? `best: ${best.group} (${Math.round(best.scores[QUALITY_SCORE].mean * 100)}%)` : source.label || 'no quality metric logged'}
          tone={qualityTone(quality)}
          trend={smooth(seriesOverTime(scored, startTimeById, QUALITY_SCORE))}
        />
        <StatTile
          icon={<ShieldOutlinedIcon sx={{ fontSize: 15 }} />}
          label="Passed safety checks"
          value={safety.length ? `${Math.round((safety.filter(Boolean).length / safety.length) * 100)}%` : '—'}
          sub={safety.length ? `${safety.filter(Boolean).length} of ${safety.length} ${unit}s` : 'no safety evals logged'}
          tone={!safety.length ? 'default' : safety.every(Boolean) ? 'success' : 'error'}
          trend={smooth(orderedSafety)}
        />
        <StatTile
          icon={<SpeedRoundedIcon sx={{ fontSize: 15 }} />}
          label="Latency p95"
          value={p95 === null ? '—' : formatMs(p95)}
          sub={latencies.length ? `median ${formatMs(percentile(latencies, 50) ?? 0)}` : 'no latency_ms logged'}
          trend={smooth(seriesOverTime(scored, startTimeById, 'latency_ms'))}
        />
        <StatTile
          icon={<PaymentsRoundedIcon sx={{ fontSize: 15 }} />}
          label={totalCost > 0 ? 'Total cost' : 'Total tokens'}
          value={totalCost > 0 ? `$${totalCost.toFixed(4)}` : totalTokens ? totalTokens.toLocaleString() : '—'}
          sub={totalCost > 0 ? `${totalTokens.toLocaleString()} tokens` : 'no cost tracked'}
          trend={smooth(seriesOverTime(scored, startTimeById, totalCost > 0 ? 'cost_usd' : 'total_tokens'))}
        />
        <StatTile
          icon={<ScienceRoundedIcon sx={{ fontSize: 15 }} />}
          label="Runs"
          value={`${finished.length - failed} / ${finished.length}`}
          sub={failed ? `${failed} failed` : 'none failed'}
          tone={failed ? 'error' : 'success'}
        />
      </Stack>

      <Stack direction="row" spacing={1.25} sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <Grid container spacing={1.5} sx={{ pb: 1.5 }}>
            <Grid size={{ xs: 12, lg: openItem ? 12 : 7 }}>
              <VariantMapCard points={points} costMetric={costMetric ?? ''} param={param} />
            </Grid>
            <Grid size={{ xs: 12, lg: openItem ? 12 : 5 }}>
              <AttentionCard
                items={attention}
                onShowTraces={hasTraces ? item => setOpenTitle(item.title) : undefined}
                selectedTitle={openTitle}
              />
            </Grid>

            {impacts.length > 0 && (
              <Grid size={{ xs: 12, lg: openItem || !showEffects ? 12 : 7 }}>
                <ParamImpactCard
                  metric={QUALITY_SCORE}
                  impacts={impacts}
                  aliases={impactParams.aliases}
                  selectedParam={impactParam || impacts[0].param}
                  onSelectParam={setImpactParam}
                />
              </Grid>
            )}

            {showEffects && (
              <Grid size={{ xs: 12, lg: openItem || !impacts.length ? 12 : 5 }}>
                <SettingEffectsCard
                  experimentId={experimentId}
                  runId={effectRuns[0].id}
                  runCount={effectRuns.length}
                  settings={effectSettings}
                  metrics={effectMetrics}
                  setting={effectSetting}
                  onSettingChange={setImpactParam}
                />
              </Grid>
            )}
          </Grid>
        </Box>

        {openItem && (
          <Box sx={{ width: { xs: '100%', lg: '46%' }, flexShrink: 0, minHeight: 0, pb: 1.5 }}>
            <TracesSidePanel
              key={openItem.title}
              title={openItem.title}
              detail={openItem.detail}
              filters={openItem.traces ?? {}}
              onClose={closePanel}
              onOpenTraces={openTraces}
            />
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
