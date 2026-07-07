import { useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { Stack, useTheme } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import PillToggle from '../../../../shared/components/pill-toggle';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { useVegaThemeConfig } from './chart-kit';
import { perTraceMetrics } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { paletteFromTheme } from '../ComparativeAnalysis/workflow-info-tooltip';
import {
  buildTraceDistributionBuckets,
  createTraceDistributionTooltipHandler,
  type TraceDistributionMetricKey,
  type TraceDistributionMetricRow,
} from './trace-tooltip';

type Metric = 'latency' | 'cost' | 'tokens';

const FIELD: Record<
  Metric,
  {
    key: TraceDistributionMetricKey;
    title: string;
    format?: string;
  }
> = {
  latency: { key: 'latencyMs', title: 'latency (ms)' },
  tokens: { key: 'tokens', title: 'tokens' },
  cost: { key: 'cost', title: 'cost ($)', format: '.4f' },
};

type DistributionChartProps = {
  details: TraceDetail[];
  experimentId?: string;
  tooltip?: ComponentProps<typeof ResponsiveCardVegaLite>['tooltip'];
};

export default function DistributionChart({
  details,
  experimentId,
  tooltip,
}: DistributionChartProps) {
  const theme = useTheme();
  const config = useVegaThemeConfig();

  const [metric, setMetric] = useState<Metric>('latency');
  const [bySession, setBySession] = useState(false);

  const rows = useMemo(() => perTraceMetrics(details), [details]);

  const hasData = rows.length > 0;
  const field = FIELD[metric];

  const chartRows = useMemo<TraceDistributionMetricRow[]>((() => {
    const sessionLabelById = new Map<string, string>();

    return rows.map((row, index) => {
      const rowRecord = row as unknown as Record<string, unknown>;
      const sessionId = String(rowRecord.sessionId ?? 'unknown');

      if (!sessionLabelById.has(sessionId)) {

        sessionLabelById.set(sessionId, sessionId);
      }

      return {
        ...rowRecord,

        // Needed by the custom tooltip to map the aggregated Vega point
        // back to the original TraceDetail object.
        traceId: String(
          rowRecord.traceId ??
            rowRecord.id ??
            details[index]?.id ??
            '',
        ),

        sessionLabel: sessionLabelById.get(sessionId),
      };
    });
  }) as () => TraceDistributionMetricRow[], [rows, details]);

  const tracesByDistributionBucket = useMemo(
    () =>
      buildTraceDistributionBuckets({
        chartRows,
        details,
        metricKey: field.key,
        bySession,
      }),
    [chartRows, details, field.key, bySession],
  );

  const distributionTooltip = useMemo(
    () =>
      createTraceDistributionTooltipHandler({
        tracesByBucket: tracesByDistributionBucket,
        metricKey: field.key,
        metricTitle: field.title,
        bySession,
        experimentId,
        palette: paletteFromTheme(theme),
      }),
    [
      tracesByDistributionBucket,
      field.key,
      field.title,
      bySession,
      experimentId,
      theme,
    ],
  );

  const controls = (
    <Stack direction="column" spacing={1} alignItems="right">
      <PillToggle
        checked={bySession}
        onChange={setBySession}
        label="By session"
        tone="info"
      />

      <SegmentedToggle
        size="small"
        value={metric}
        onChange={v => setMetric(v as Metric)}
        options={[
          { value: 'latency', label: 'Latency' },
          { value: 'tokens', label: 'Tokens' },
          { value: 'cost', label: 'Cost' },
        ]}
      />
    </Stack>
  );

  const spec = useMemo<Record<string, unknown>>(() => {
    if (!hasData) return {};

    const groupByFields = bySession
      ? [field.key, 'sessionLabel']
      : [field.key];

    const sessionGroupBy = bySession ? ['sessionLabel'] : undefined;

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      config,
      data: { values: chartRows },

      transform: [
        {
          filter: `isValid(datum["${field.key}"]) && datum["${field.key}"] != null`,
        },
        {
          aggregate: [{ op: 'count', as: 'traceCount' }],
          groupby: groupByFields,
        },
        {
          window: [
            {
              op: 'sum',
              field: 'traceCount',
              as: 'cumulativeTraces',
            },
          ],
          sort: [{ field: field.key, order: 'ascending' }],
          frame: [null, 0],
          ...(sessionGroupBy ? { groupby: sessionGroupBy } : {}),
        },
        {
          joinaggregate: [
            {
              op: 'sum',
              field: 'traceCount',
              as: 'totalTraces',
            },
          ],
          ...(sessionGroupBy ? { groupby: sessionGroupBy } : {}),
        },
        {
          calculate: 'datum.cumulativeTraces / datum.totalTraces * 100',
          as: 'percentOfTraces',
        },
      ],

      encoding: {
        x: {
          field: field.key,
          type: 'quantitative',
          title: field.title,
          axis: field.format ? { format: field.format } : undefined,
        },
        y: {
          field: 'percentOfTraces',
          type: 'quantitative',
          title: 'cumulative traces (%)',
          scale: { domain: [0, 100] },
          axis: { format: '.0f' },
          stack: null,
        },
        color: bySession
          ? {
              field: 'sessionLabel',
              type: 'nominal',
              legend: null,
              scale: { scheme: 'tableau20' },
            }
          : {
              value: theme.palette.success.main,
            },
        order: {
          field: field.key,
          type: 'quantitative',
        },

        // Important:
        // The title values are raw field names because the custom tooltip
        // handler reads value[field.key].
        tooltip: [
          ...(bySession
            ? [
                {
                  field: 'sessionLabel',
                  title: 'sessionLabel',
                },
              ]
            : []),
          {
            field: field.key,
            type: 'quantitative',
            title: field.key,

            // Do not format cost here, otherwise the tooltip value may be
            // rounded and fail to match the raw bucket key.
            ...(field.key !== 'cost' && field.format
              ? { format: field.format }
              : {}),
          },
          {
            field: 'traceCount',
            type: 'quantitative',
            title: 'traceCount',
          },
          {
            field: 'cumulativeTraces',
            type: 'quantitative',
            title: 'cumulativeTraces',
          },
          {
            field: 'percentOfTraces',
            type: 'quantitative',
            title: 'percentOfTraces',
            format: '.1f',
          },
        ],
      },

      layer: [
        {
          mark: {
            type: 'area',
            interpolate: 'step-after',
            opacity: 0.22,
          },
        },
        {
          mark: {
            type: 'line',
            interpolate: 'step-after',
            strokeWidth: 2,
          },
        },
        {
          mark: {
            type: 'point',
            filled: true,
            size: 34,
            opacity: 0.85,
          },
        },
      ],
    };
  }, [
    hasData,
    config,
    chartRows,
    field.key,
    field.title,
    field.format,
    bySession,
  ]);

  return (
    <ResponsiveCardVegaLite
      title="Distribution"
      details="cumulative per-trace spread"
      spec={spec}
      tooltip={hasData ? distributionTooltip : tooltip}
      controlPanel={controls}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No traces to plot."
          icon={<TimelineIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={240}
      aspectRatio={2.6}
      actions={false}
      isStatic={false}
    />
  );
}