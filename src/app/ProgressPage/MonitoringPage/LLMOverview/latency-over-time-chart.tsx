import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { formatMs } from '../../../../shared/models/observability/agentic-conventions';
import { latencyOverTime } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { paletteFromTheme } from '../ComparativeAnalysis/workflow-info-tooltip';
import { buildTraceHourBuckets, createLatencyBucketTooltipHandler } from './trace-tooltip';

export default function LatencyOverTimeChart({
  details,
  experimentId,
  isLoading,
}: {
  details: TraceDetail[];
  experimentId?: string;
  isLoading: boolean;
}) {
  const theme = useTheme();

  const { rows, avgLatencyMs } = useMemo(() => latencyOverTime(details), [details]);
  const hasData = rows.length > 0;
  const lastRow = rows[rows.length - 1];
  const totalTraces = useMemo(() => rows.reduce((sum, row) => sum + row.count, 0), [rows]);

  const { tracesByHour, isDailyBucket } = useMemo(() => buildTraceHourBuckets(details), [details]);

  // Pad tightly around the percentile values (rather than always including 0) so p50/p90
  // aren't squashed near the top when p99 is much larger than the rest of the series.
  const yDomain = useMemo(() => {
    if (!hasData) return undefined;

    const values = rows.flatMap(row => [row.p50, row.p90, row.p99]);

    values.push(avgLatencyMs);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const pad = (range === 0 ? Math.max(Math.abs(max), 1) : range) * 0.1;

    return [Math.max(0, min - pad), max + pad];
  }, [rows, avgLatencyMs, hasData]);

  const latencyBucketTooltip = useMemo(
    () =>
      createLatencyBucketTooltipHandler({
        tracesByBucket: tracesByHour,
        isDailyBucket,
        experimentId,
        palette: paletteFromTheme(theme),
      }),
    [tracesByHour, isDailyBucket, experimentId, theme],
  );

  const spec = useMemo(() => {
    if (!hasData) return {};

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: rows },
      layer: [
        // The AVG rule/label are purely decorative and carry no tooltip — they're laid
        // down first (bottom of z-order) so they never steal hover hit-testing away from
        // the point marks above. With a single x-bucket they'd otherwise sit at the exact
        // same position as the points, and hovering near the boundary between an
        // interactive point and a non-interactive mark drawn on top of it made the
        // tooltip flicker in and out ("wobbling").
        {
          mark: { type: 'rule', strokeDash: [4, 4] },
          encoding: {
            y: { datum: avgLatencyMs, scale: { domain: yDomain } },
            color: { value: theme.palette.text.secondary },
          },
        },
        ...(lastRow
          ? [
              {
                data: { values: [{ bucketLabel: lastRow.bucketLabel }] },
                mark: {
                  type: 'text',
                  align: 'right',
                  baseline: 'line-bottom',
                  dy: -4,
                  fontSize: 10,
                  fontWeight: 700,
                },
                encoding: {
                  x: { field: 'bucketLabel', type: 'ordinal' },
                  y: { datum: avgLatencyMs, scale: { domain: yDomain } },
                  text: { value: `AVG (${formatMs(avgLatencyMs)})` },
                  color: { value: theme.palette.text.secondary },
                },
              },
            ]
          : []),
        {
          transform: [{ fold: ['p50', 'p90', 'p99'], as: ['percentile', 'latencyMs'] }],
          mark: { type: 'line', interpolate: 'monotone', point: { size: 20 } },
          encoding: {
            x: {
              field: 'bucketLabel',
              type: 'ordinal',
              title: null,
              sort: { field: 'bucketStart' },
              // domain:false avoids doubling up with the y-axis's zero gridline, which sits
              // on the exact same pixel row as this axis's own baseline.
              axis: { grid: false, labelAngle: 0, domain: false },
            },
            y: {
              field: 'latencyMs',
              type: 'quantitative',
              title: 'Latency (ms)',
              scale: { domain: yDomain },
              axis: { grid: true },
            },
            color: {
              field: 'percentile',
              type: 'nominal',
              sort: ['p50', 'p90', 'p99'],
              scale: {
                domain: ['p50', 'p90', 'p99'],
                range: [theme.palette.info.light, theme.palette.info.main, theme.palette.warning.main],
              },
              legend: { orient: 'bottom', title: null },
            },
            tooltip: [
              { field: 'bucketKey', title: 'bucketKey', type: 'nominal' },
              { field: 'percentile', title: 'percentile', type: 'nominal' },
              { field: 'latencyMs', title: 'latencyMs', type: 'quantitative' },
            ],
          },
        },
      ],
      config: {
        view: { stroke: null },
      },
    } as Record<string, unknown>;
  }, [rows, hasData, avgLatencyMs, lastRow, theme, yDomain]);

  return (
    <ResponsiveCardVegaLite
      title="Latency"
      details={hasData ? `Avg ${formatMs(avgLatencyMs)} across ${totalTraces.toLocaleString()} traces` : null}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={hasData ? latencyBucketTooltip : undefined}
      showSettings={hasData}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No latency timestamps to plot."
          icon={<TimerOutlinedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={300}
      aspectRatio={1.7}
      loading={isLoading}
    />
  );
}
