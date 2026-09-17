import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { tokensOverTime } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { paletteFromTheme } from '../ComparativeAnalysis/workflow-info-tooltip';
import { buildTraceHourBuckets, createTokensBucketTooltipHandler } from './trace-tooltip';

const formatTokenCount = (value: number): string =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value);

export default function TokensOverTimeChart({
  details,
  experimentId,
  isLoading,
}: {
  details: TraceDetail[];
  experimentId?: string;
  isLoading: boolean;
}) {
  const theme = useTheme();

  const { rows, avgTokensPerTrace } = useMemo(() => tokensOverTime(details), [details]);
  const hasData = rows.length > 0;
  const lastRow = rows[rows.length - 1];
  const totalTraces = useMemo(() => rows.reduce((sum, row) => sum + row.count, 0), [rows]);

  const { tracesByHour, isDailyBucket } = useMemo(() => buildTraceHourBuckets(details), [details]);

  // Pad tightly around the percentile values (rather than always including 0) so p50/p90
  // aren't squashed near the top when p99 is much larger than the rest of the series.
  const yDomain = useMemo(() => {
    if (!hasData) return undefined;

    const values = rows.flatMap(row => [row.p50, row.p90, row.p99]);

    values.push(avgTokensPerTrace);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const pad = (range === 0 ? Math.max(Math.abs(max), 1) : range) * 0.1;

    return [Math.max(0, min - pad), max + pad];
  }, [rows, avgTokensPerTrace, hasData]);

  const tokensBucketTooltip = useMemo(
    () =>
      createTokensBucketTooltipHandler({
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
            y: { datum: avgTokensPerTrace, scale: { domain: yDomain } },
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
                  y: { datum: avgTokensPerTrace, scale: { domain: yDomain } },
                  text: { value: `AVG (${formatTokenCount(avgTokensPerTrace)})` },
                  color: { value: theme.palette.text.secondary },
                },
              },
            ]
          : []),
        {
          transform: [{ fold: ['p50', 'p90', 'p99'], as: ['percentile', 'tokens'] }],
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
              field: 'tokens',
              type: 'quantitative',
              title: 'Tokens',
              scale: { domain: yDomain },
              axis: { grid: true },
            },
            color: {
              field: 'percentile',
              type: 'nominal',
              sort: ['p50', 'p90', 'p99'],
              scale: {
                domain: ['p50', 'p90', 'p99'],
                range: [theme.palette.success.light, theme.palette.success.main, theme.palette.warning.main],
              },
              legend: { orient: 'bottom', title: null },
            },
            tooltip: [
              { field: 'bucketKey', title: 'bucketKey', type: 'nominal' },
              { field: 'percentile', title: 'percentile', type: 'nominal' },
              { field: 'tokens', title: 'tokens', type: 'quantitative' },
            ],
          },
        },
      ],
      config: {
        view: { stroke: null },
      },
    } as Record<string, unknown>;
  }, [rows, hasData, avgTokensPerTrace, lastRow, theme, yDomain]);

  return (
    <ResponsiveCardVegaLite
      title="Tokens per trace"
      details={hasData ? `Avg ${formatTokenCount(avgTokensPerTrace)} tokens/trace across ${totalTraces.toLocaleString()} traces` : null}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={hasData ? tokensBucketTooltip : undefined}
      showSettings={hasData}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No token counts to plot."
          icon={<TokenRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
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
