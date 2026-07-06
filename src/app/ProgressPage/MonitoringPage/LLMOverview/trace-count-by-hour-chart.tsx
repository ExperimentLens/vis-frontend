import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useTheme } from '@mui/material';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

type TraceHourRow = {
  hourStart: string;
  hourLabel: string;
  traces: number;
};

type TraceCountByHourChartProps = {
  details: TraceDetail[];
  tooltip: ComponentProps<typeof ResponsiveCardVegaLite>['tooltip'];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const traceDate = (trace: TraceDetail): Date | null => {
  const row = trace as unknown;

  if (!isRecord(row)) return null;

  return (
    parseDate(row.timestamp) ??
    parseDate(row.startTime) ??
    parseDate(row.createdAt) ??
    parseDate(row.created_at) ??
    parseDate(row.start_time) ??
    null
  );
};

const floorToHour = (date: Date) => {
  const copy = new Date(date);

  copy.setMinutes(0, 0, 0);

  return copy;
};

const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatHourLabel = (date: Date, showDate: boolean) => {
  if (!showDate) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const tracesByHour = (details: TraceDetail[]): TraceHourRow[] => {
  const counts = new Map<number, number>();

  details.forEach(trace => {
    const date = traceDate(trace);

    if (!date) return;

    const hourStart = floorToHour(date).getTime();

    counts.set(hourStart, (counts.get(hourStart) ?? 0) + 1);
  });

  const sortedHours = [...counts.keys()].sort((a, b) => a - b);

  const uniqueDays = new Set(
    sortedHours.map(hour => dayKey(new Date(hour))),
  );

  const showDate = uniqueDays.size > 1;

  return sortedHours.map(hour => {
    const date = new Date(hour);

    return {
      hourStart: date.toISOString(),
      hourLabel: formatHourLabel(date, showDate),
      traces: counts.get(hour) ?? 0,
    };
  });
};

export default function TraceCountByHourChart({
  details,
  tooltip,
}: TraceCountByHourChartProps) {
  const theme = useTheme();

  const rows = useMemo(() => tracesByHour(details), [details]);

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
    () => new Set(rows.map(row => row.hourStart)).size,
    [rows],
  );

  const barPaddingOuter = useMemo(
    () => Math.max(0.05, (2.1 - barCount) / 2),
    [barCount],
  );

  const spec = useMemo(
    () =>
      ({
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: rows },
        mark: {
          type: 'bar',
          cornerRadiusTopLeft: 4,
          cornerRadiusTopRight: 4,
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
              labelColor: theme.palette.text.secondary,
              tickColor: theme.palette.divider,
              domainColor: theme.palette.divider,
              grid: false,
            },
          },          
          y: {
            field: 'traces',
            type: 'quantitative',
            title: null,
            axis: {
              labels: false,
              ticks: false,
              domain: false,
              gridColor: theme.palette.divider,
            },
          },
          color: {
            value: theme.palette.primary.main,
          },
          tooltip: [
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
      theme.palette.primary.main,
      theme.palette.text.secondary,
      theme.palette.divider,
      barPaddingOuter,
    ],
  );

  return (
    <ResponsiveCardVegaLite
      title="Traces"
      details={`${totalTraces.toLocaleString()} traces by hour`}
      spec={rows.length > 0 ? spec : {}}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
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
    />
  );
}