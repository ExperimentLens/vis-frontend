import { useState } from 'react';
import { Stack, useTheme } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import PillToggle from '../../../../shared/components/pill-toggle';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { perTraceMetrics } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

type Metric = 'latency' | 'cost' | 'tokens';

const FIELD: Record<
  Metric,
  {
    key: 'latencyMs' | 'cost' | 'tokens';
    title: string;
    format?: string;
  }
> = {
  latency: { key: 'latencyMs', title: 'latency (ms)' },
  tokens: { key: 'tokens', title: 'tokens' },
  cost: { key: 'cost', title: 'cost ($)', format: '.4f' },
};

export default function DistributionChart({
  details,
}: {
  details: TraceDetail[];
}) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();

  const [metric, setMetric] = useState<Metric>('latency');
  const [bySession, setBySession] = useState(false);

  const rows = perTraceMetrics(details);
  const hasData = rows.length > 0;
  const field = FIELD[metric];

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

  const sessionLabelById = new Map<string, string>();

  const chartRows = rows.map(row => {
    const sessionId = String(row.sessionId ?? 'unknown');

    if (!sessionLabelById.has(sessionId)) {
      const sessionNumber = sessionLabelById.size + 1;
      const shortSessionId =sessionId;

      sessionLabelById.set(
        sessionId,
        `S${sessionNumber} ${shortSessionId}`,
      );
    }

    return {
      ...row,
      sessionLabel: sessionLabelById.get(sessionId),
    };
  });

  const groupByFields = bySession
    ? [field.key, 'sessionLabel']
    : [field.key];

  const sessionGroupBy = bySession ? ['sessionLabel'] : undefined;

  const spec: Record<string, unknown> = hasData
    ? {
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
          tooltip: [
            ...(bySession
              ? [
                  {
                    field: 'sessionLabel',
                    title: 'session',
                  },
                ]
              : []),
            {
              field: field.key,
              type: 'quantitative',
              title: field.title,
              format: field.format,
            },
            {
              field: 'traceCount',
              type: 'quantitative',
              title: 'traces at value',
            },
            {
              field: 'cumulativeTraces',
              type: 'quantitative',
              title: 'traces ≤ value',
            },
            {
              field: 'percentOfTraces',
              type: 'quantitative',
              title: 'traces (%)',
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
      }
    : {};

  return (
    <ResponsiveCardVegaLite
      title="Distribution"
      details="cumulative per-trace spread"
      spec={spec}
      tooltip={tooltip}
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