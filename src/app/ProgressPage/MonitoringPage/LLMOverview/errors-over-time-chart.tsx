import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { errorsOverTime } from '../../../../shared/utils/observability-aggregates';
import { isErrorLevel } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { paletteFromTheme } from '../ComparativeAnalysis/workflow-info-tooltip';
import { buildTraceHourBuckets, createErrorBucketTooltipHandler } from './trace-tooltip';

export default function ErrorsOverTimeChart({
  details,
  experimentId,
  isLoading,
}: {
  details: TraceDetail[];
  experimentId?: string;
  isLoading: boolean;
}) {
  const theme = useTheme();

  const { rows, totalErrors, overallErrorRate } = useMemo(() => errorsOverTime(details), [details]);
  const hasData = rows.length > 0;

  const { tracesByHour, isDailyBucket } = useMemo(() => buildTraceHourBuckets(details), [details]);

  // The tooltip's "view N traces" link should jump to the traces that actually
  // errored in that bucket, not every trace in it.
  const errorTracesByBucket = useMemo(() => {
    const m = new Map<string, TraceDetail[]>();

    tracesByHour.forEach((traces, key) => {
      const errored = traces.filter(t => t.observations.some(isErrorLevel));

      if (errored.length > 0) m.set(key, errored);
    });

    return m;
  }, [tracesByHour]);

  const errorBucketTooltip = useMemo(
    () =>
      createErrorBucketTooltipHandler({
        tracesByBucket: errorTracesByBucket,
        isDailyBucket,
        experimentId,
        palette: paletteFromTheme(theme),
      }),
    [errorTracesByBucket, isDailyBucket, experimentId, theme],
  );

  const barCount = useMemo(() => new Set(rows.map(row => row.bucketKey)).size, [rows]);
  const barPaddingOuter = useMemo(() => Math.max(0.1, (3 - barCount) / 2), [barCount]);

  const spec = useMemo(() => {
    if (!hasData) return {};

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: rows },
      layer: [
        {
          mark: { type: 'bar', cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
          encoding: {
            x: {
              field: 'bucketLabel',
              type: 'ordinal',
              title: null,
              sort: { field: 'bucketStart' },
              scale: { paddingInner: 0.1, paddingOuter: barPaddingOuter },
              axis: { grid: false, labelAngle: 0 },
            },
            y: {
              field: 'errorCount',
              type: 'quantitative',
              title: 'Errors',
              axis: { grid: true, titleColor: theme.palette.error.main },
            },
            color: { value: theme.palette.error.main },
            tooltip: [
              { field: 'bucketKey', title: 'bucketKey', type: 'nominal' },
              { field: 'errorCount', title: 'errorCount', type: 'quantitative' },
              { field: 'totalCount', title: 'totalCount', type: 'quantitative' },
              { field: 'errorRate', title: 'errorRate', type: 'quantitative' },
            ],
          },
        },
        {
          mark: { type: 'line', point: { size: 24 }, interpolate: 'monotone' },
          encoding: {
            x: {
              field: 'bucketLabel',
              type: 'ordinal',
              sort: { field: 'bucketStart' },
            },
            y: {
              field: 'errorRate',
              type: 'quantitative',
              title: 'Error rate',
              axis: { format: '%', titleColor: theme.palette.warning.main },
              scale: { domain: [0, Math.max(0.1, ...rows.map(r => r.errorRate)) * 1.15] },
            },
            color: { value: theme.palette.warning.main },
            tooltip: [
              { field: 'bucketKey', title: 'bucketKey', type: 'nominal' },
              { field: 'errorCount', title: 'errorCount', type: 'quantitative' },
              { field: 'totalCount', title: 'totalCount', type: 'quantitative' },
              { field: 'errorRate', title: 'errorRate', type: 'quantitative' },
            ],
          },
        },
      ],
      resolve: { scale: { y: 'independent' } },
      config: { view: { stroke: null } },
    } as Record<string, unknown>;
  }, [rows, hasData, barPaddingOuter, theme]);

  return (
    <ResponsiveCardVegaLite
      title="Errors"
      details={hasData ? `${totalErrors.toLocaleString()} errors · ${(overallErrorRate * 100).toFixed(1)}% overall rate` : null}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={hasData ? errorBucketTooltip : undefined}
      showSettings={hasData}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No observations to check for errors."
          icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={300}
      aspectRatio={2.8}
      loading={isLoading}
    />
  );
}
