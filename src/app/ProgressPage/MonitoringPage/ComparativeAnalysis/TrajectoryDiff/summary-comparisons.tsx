import { useMemo } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import { perTraceMetrics, tokenSplit, verdictPassRates } from '../../../../../shared/utils/observability-aggregates';
import ResponsiveCardVegaLite from '../../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import {
  createWorkflowDatumTooltipHandler,
  paletteFromTheme,
} from '../workflow-info-tooltip';
import type { IRun } from '../../../../../shared/models/experiment/run.model';
import { useTheme } from '@mui/material';

type VegaTooltip = Parameters<typeof ResponsiveCardVegaLite>[0]['tooltip'];
type VegaSignals = Parameters<typeof ResponsiveCardVegaLite>[0]['signalListeners'];

type SummaryChartProps = {
  detailsByRun: Record<string, TraceDetail[]>;
  runIds: string[];
  runNameById: Record<string, string>;
  summaryColor: { domain: string[]; range: string[] };
  signalListeners: VegaSignals;
  hoveredWorkflowId: string | number | null;
  workflowsData: IRun[];
  experimentId: string | undefined;
  workflowColors: Record<string, string>;

};

const SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';
const hoverParam = { name: 'hover', select: { type: 'point', fields: ['id'], on: 'mouseover', clear: 'mouseout' } };

const hoverOpacity = (hoveredWorkflowId: string | number | null) =>
  hoveredWorkflowId
    ? { condition: { test: `datum.id === '${hoveredWorkflowId}'`, value: 1 }, value: 0.35 }
    : undefined;

const noData = (label: string) => (
  <InfoMessage message={label} type="info" icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />} fullHeight />
);

const card = (
  title: string,
  spec: Record<string, unknown>,
  empty: boolean,
  emptyLabel: string,
  tooltip: VegaTooltip,
  signalListeners: VegaSignals,
  details?: string,
) => (
  <ResponsiveCardVegaLite
    title={title}
    details={details}
    spec={spec}
    actions={false}
    isStatic={false}
    tooltip={tooltip}
    signalListeners={signalListeners}
    sx={{ width: '100%', maxWidth: '100%' }}
    minHeight={220}
    showInfoMessage={empty}
    showSettings={true}
    infoMessage={noData(emptyLabel)}
  />
);

/** #2 — pass rate per judge, grouped by run. */
export const JudgePassRateChart = ({ detailsByRun, runIds, runNameById, summaryColor, signalListeners, hoveredWorkflowId, workflowsData, experimentId, workflowColors }: SummaryChartProps) => {
  const theme = useTheme();
  const data = useMemo(
    () =>
      runIds.flatMap(id =>
        verdictPassRates(detailsByRun[id] ?? [], 'judges').map(v => ({
          judge: v.name,
          id,
          runName: runNameById[id] ?? id,
          passRate: Number(v.passRate.toFixed(4)),
        })),
      ),
    [detailsByRun, runIds, runNameById],
  );

  const tooltipHandler = experimentId
    ? createWorkflowDatumTooltipHandler({
        title: 'Metric: Judge pass rate',
        data,
        workflowsData,
        experimentId,
        palette: paletteFromTheme(theme),
        colorMapping: workflowColors,
        valueLabel: 'Pass rate',
        getValue: row => row.passRate,
        formatValue: value =>
          typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : '—',
        getTopLine: row => `Judge: ${String(row.judge)}`,
        match: (row, raw) =>
          String(row.id) === String(raw.id ?? '') &&
          String(row.judge) === String(raw.judge ?? ''),
      })
    : undefined;

  const spec = {
    $schema: SCHEMA,
    data: { values: data },
    params: [hoverParam],
    mark: { type: 'bar', cornerRadiusEnd: 3, tooltip: true },
    encoding: {
      x: { field: 'judge', type: 'nominal', axis: { title: null, labelAngle: 0, labelLimit: 90 } },
      xOffset: { field: 'id', sort: runIds },
      y: { field: 'passRate', type: 'quantitative', axis: { title: null, format: '.0%' }, scale: { domain: [0, 1] } },
      color: { field: 'id', type: 'nominal', scale: summaryColor, legend: null },
      opacity: hoverOpacity(hoveredWorkflowId),
    },
  } as Record<string, unknown>;

  return card('Judge pass rate by judge', spec, data.length === 0, 'No judge verdicts.', tooltipHandler, signalListeners);
};

/** #4 — prompt vs. completion tokens, stacked per run (light = prompt, solid = completion). */
export const TokenSplitChart = ({ detailsByRun, runIds, runNameById, summaryColor, signalListeners, hoveredWorkflowId, workflowsData, experimentId, workflowColors }: SummaryChartProps) => {
  const theme = useTheme();
  const data = useMemo(
    () =>
      runIds.flatMap(id => {
        const s = tokenSplit(detailsByRun[id] ?? []);
        return [
          { id, runName: runNameById[id] ?? id, kind: 'prompt', value: s.prompt },
          { id, runName: runNameById[id] ?? id, kind: 'completion', value: s.completion },
        ];
      }),
    [detailsByRun, runIds, runNameById],
  );

  const empty = data.every(d => d.value === 0);

  const tooltipHandler = experimentId
    ? createWorkflowDatumTooltipHandler({
        title: 'Metric: Tokens',
        data,
        workflowsData,
        experimentId,
        palette: paletteFromTheme(theme),
        colorMapping: workflowColors,
        valueLabel: 'Count',
        getValue: row => row.value,
        getTopLine: row => `Tokens: ${String(row.kind)}`,
        match: (row, raw) =>
          String(row.id) === String(raw.id ?? '') &&
          String(row.kind) === String(raw.kind ?? ''),
      })
    : undefined;

  const spec = {
    $schema: SCHEMA,
    data: { values: data },
    params: [hoverParam],
    mark: { type: 'bar', cornerRadiusEnd: 3, tooltip: true },
    encoding: {
      x: { field: 'id', type: 'ordinal', sort: runIds, scale: { paddingInner: 0.2, paddingOuter: 0.3 }, axis: { labels: false, ticks: false, title: null, domain: false } },
      y: { field: 'value', type: 'quantitative', axis: { title: null }, stack: 'zero' },
      color: { field: 'id', type: 'nominal', scale: summaryColor, legend: null },
      opacity: { field: 'kind', type: 'nominal', scale: { domain: ['completion', 'prompt'], range: [1, 0.45] }, legend: null },
      order: { field: 'kind', type: 'nominal' },
      stroke: hoveredWorkflowId ? { condition: { test: `datum.id === '${hoveredWorkflowId}'`, value: '#000' }, value: 'transparent' } : undefined,
      strokeWidth: hoveredWorkflowId ? { condition: { test: `datum.id === '${hoveredWorkflowId}'`, value: 1.5 }, value: 0 } : undefined,
    },
  } as Record<string, unknown>;

  return card('Tokens — prompt vs completion', spec, empty, 'No token usage recorded.', tooltipHandler, signalListeners, 'light = prompt · solid = completion');
};

/** #5 — per-trace latency vs. cost (or tokens when cost is unpriced), colored by run. */
export const LatencyCostChart = ({
  detailsByRun,
  runIds,
  runNameById,
  summaryColor,
  signalListeners,
  hoveredWorkflowId,
  workflowsData,
  experimentId,
  workflowColors,
}: SummaryChartProps) => {
  const theme = useTheme();

  const points = useMemo(
    () =>
      runIds.flatMap(id =>
        perTraceMetrics(detailsByRun[id] ?? []).map((p, index) => ({
          traceKey: `${id}-${index}`,
          id,
          runName: runNameById[id] ?? id,
          latencyMs: Number(p.latencyMs.toFixed(0)),
          cost: p.cost,
          tokens: p.tokens,
          question: p.question,
        })),
      ),
    [detailsByRun, runIds, runNameById],
  );

  const anyCost = points.some(p => p.cost > 0);
  const yTitle = anyCost ? 'cost ($)' : 'tokens';

  const chartPoints = useMemo(
    () =>
      points.map(p => ({
        ...p,
        value: anyCost ? p.cost : p.tokens,
      })),
    [points, anyCost],
  );

  const tooltipHandler = experimentId
    ? createWorkflowDatumTooltipHandler({
        title: `Metric: Latency vs ${anyCost ? 'cost' : 'tokens'}`,
        data: chartPoints,
        workflowsData,
        experimentId,
        palette: paletteFromTheme(theme),
        colorMapping: workflowColors,
        valueLabel: anyCost ? 'Cost' : 'Tokens',
        getValue: row => row.value,
        getExtraParams: row => [
          {
            name: 'Latency',
            value: `${Number(row.latencyMs).toLocaleString()} ms`,
          },
        ],
        getTopLine: row =>
          row.question ? `Question: ${String(row.question)}` : undefined,
        match: (row, raw) =>
          String(row.traceKey) === String(raw.traceKey ?? ''),
      })
    : undefined;

  const spec = {
    $schema: SCHEMA,
    data: { values: chartPoints },
    params: [hoverParam],
    mark: {
      type: 'point',
      filled: true,
      size: 55,
      opacity: 0.75,
      tooltip: true,
    },
    encoding: {
      x: {
        field: 'latencyMs',
        type: 'quantitative',
        axis: { title: 'latency (ms)' },
      },
      y: {
        field: 'value',
        type: 'quantitative',
        axis: { title: yTitle },
      },
      color: {
        field: 'id',
        type: 'nominal',
        scale: summaryColor,
        legend: null,
      },
      opacity: hoverOpacity(hoveredWorkflowId),

      // Important: include traceKey in the Vega datum payload.
      detail: {
        field: 'traceKey',
        type: 'nominal',
      },
    },
  } as Record<string, unknown>;

  return card(
    `Latency vs ${anyCost ? 'cost' : 'tokens'}`,
    spec,
    chartPoints.length === 0,
    'No per-trace metrics.',
    tooltipHandler,
    signalListeners,
    'each point is one trace · bottom-left = efficient',
  );
};
