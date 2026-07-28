import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useTheme } from '@mui/material';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { paletteFromTheme } from '../ComparativeAnalysis/workflow-info-tooltip';
import {
  buildTraceHourBuckets,
  createTraceHourTooltipHandler,
  dayKey,
} from './trace-tooltip';

type TraceCountByHourChartProps = {
  details: TraceDetail[];
  experimentId?: string;
  tooltip?: ComponentProps<typeof ResponsiveCardVegaLite>['tooltip'];
  isLoading: boolean;
  onSelectBucket?: (traceIds: string[] | null) => void;
};

export default function TraceCountByHourChart({
  details,
  experimentId,
  tooltip,
  isLoading,
  onSelectBucket,
}: TraceCountByHourChartProps) {
  const theme = useTheme();

  const { rows, tracesByHour } = useMemo(
    () => buildTraceHourBuckets(details),
    [details],
  );

  const signalListeners = useMemo(
    () => ({
      select_bucket: (_name: string, value: unknown) => {
        if (!onSelectBucket) return;

        const v = value as { hourKey?: string | string[] } | null | undefined;
        const hourKey = v?.hourKey
          ? (Array.isArray(v.hourKey) ? v.hourKey[0] : v.hourKey)
          : null;

        if (!hourKey) {
          onSelectBucket(null);

          return;
        }

        const traces = tracesByHour.get(hourKey) ?? [];

        onSelectBucket(traces.map(t => t.id));
      },
    }),
    [tracesByHour, onSelectBucket],
  );

  const totalTraces = useMemo(
    () => rows.reduce((sum, row) => sum + row.traces, 0),
    [rows],
  );

  const hasMultipleDays = useMemo(() => {
    const days = new Set(
      rows.map(row => dayKey(new Date(row.hourStart))),
    );

    return days.size > 1;
  }, [rows]);

  const barCount = useMemo(
    () => new Set(rows.map(row => row.hourKey)).size,
    [rows],
  );

  const barPaddingOuter = useMemo(
    () => Math.max(0.1, (3 - barCount) / 2),
    [barCount],
  );

  const traceHourTooltip = useMemo(
    () =>
      createTraceHourTooltipHandler({
        tracesByHour,
        experimentId,
        palette: paletteFromTheme(theme),
      }),
    [tracesByHour, experimentId, theme],
  );

  const spec = useMemo(
    () =>
      ({
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: rows },
        params: [
          { name: 'select_bucket', select: { type: 'point', fields: ['hourKey'] } },
        ],
        mark: {
          type: 'bar',
          cornerRadiusTopLeft: 4,
          cornerRadiusTopRight: 4,
          color: theme.palette.success.main,
          cursor: 'pointer',
        },
        encoding: {
          x: {
            field: 'hourLabel',
            type: 'ordinal',
            title: null,
            sort: {
              field: 'hourStart',
              order: 'ascending',
            },
            scale: {
              paddingInner: 0.1,
              paddingOuter: barPaddingOuter,
            },
            axis: {
              labelAngle: hasMultipleDays ? -30 : 0,
              grid: false,
            },
          },
          y: {
            field: 'traces',
            type: 'quantitative',
            title: 'Number of traces',
            axis: {
              labels: true,
              ticks: true,
              domain: false,
            },
          },
          color: {
            value: theme.palette.success.main,
          },
          opacity: {
            condition: { param: 'select_bucket', value: 1 },
            value: 0.55,
          },
          tooltip: [
            {
              field: 'hourKey',
              title: 'hourKey',
              type: 'nominal',
            },
            {
              field: 'hourStart',
              title: 'Hour',
              type: 'temporal',
              format: '%b %d, %H:%M',
            },
            {
              field: 'traces',
              title: 'Traces',
              type: 'quantitative',
            },
          ],
        },
        config: {
          view: {
            stroke: null,
          },
        },
      }) as Record<string, unknown>,
    [
      rows,
      hasMultipleDays,
      barPaddingOuter,
    ],
  );

  return (
    <ResponsiveCardVegaLite
      title="Traces by time"
      details={`${totalTraces.toLocaleString()} traces tracked`}
      spec={rows.length > 0 ? spec : {}}
      actions={false}
      isStatic={false}
      tooltip={rows.length > 0 ? traceHourTooltip : tooltip}
      signalListeners={signalListeners}
      disableTooltipPin
      showSettings={rows.length > 0}
      showInfoMessage={rows.length === 0}
      infoMessage={
        <InfoMessage
          message="No trace timestamps to plot."
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
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