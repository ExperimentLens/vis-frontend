import { Handler } from 'vega-tooltip';

import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import {
  WF_INFO_TIP_CLASS,
  type WorkflowTooltipPalette,
} from '../ComparativeAnalysis/workflow-info-tooltip';

export type TraceHourRow = {
  hourKey: string;
  hourStart: string;
  hourLabel: string;
  traces: number;
};

export type TraceHourBuckets = {
  rows: TraceHourRow[];
  tracesByHour: Map<string, TraceDetail[]>;
};

export type TraceDistributionMetricKey =
  | 'latencyMs'
  | 'cost'
  | 'tokens';

export type TraceDistributionMetricRow = Record<string, unknown> & {
  id?: string;
  traceId?: string;
  sessionId?: string | null;
  sessionLabel?: string;
};

/**
 * The pinned tooltip has controls positioned over its top area.
 * Extra top padding prevents those controls from covering the title.
 */
const tooltipStyles = `
  <style>
    .vega-tooltip-pinned .${WF_INFO_TIP_CLASS} {
      padding-top: 34px !important;
      pointer-events: auto !important;
    }

    .vega-tooltip-pinned .${WF_INFO_TIP_CLASS} a {
      pointer-events: auto !important;
      cursor: pointer !important;
    }
  </style>
`;

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const traceDate = (trace: TraceDetail): Date | null => {
  const date = new Date(trace.timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const dayKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const formatHour = (
  date: Date,
  includeDate: boolean,
): string =>
  includeDate
    ? date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });

const formatDay = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Candidate bucket widths, finest first. `pickBucketMs` returns the finest
 * one that still keeps the chart to a readable number of bars — so a burst
 * of traces inside a single hour buckets by minute instead of collapsing
 * into one or two hour-wide bars, while a multi-day experiment still buckets
 * by hour/day instead of exploding into hundreds of bars.
 */
const BUCKET_CANDIDATES_MS = [
  MINUTE_MS,
  5 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
  7 * DAY_MS,
];

const MAX_BARS = 24;

const pickBucketMs = (spanMs: number): number => {
  if (spanMs <= 0) return BUCKET_CANDIDATES_MS[0];

  const fit = BUCKET_CANDIDATES_MS.find(size => spanMs / size <= MAX_BARS);

  return fit ?? BUCKET_CANDIDATES_MS[BUCKET_CANDIDATES_MS.length - 1];
};

const formatBucketLabel = (
  date: Date,
  bucketMs: number,
  includeDate: boolean,
): string =>
  bucketMs >= DAY_MS ? formatDay(date) : formatHour(date, includeDate);

const formatTooltipHour = (
  date: Date | null,
): string =>
  date?.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) ?? 'Unknown hour';

const formatMetric = (
  value: number | null,
  metricKey: TraceDistributionMetricKey,
): string => {
  if (value === null) return '—';

  if (metricKey === 'cost') {
    return value === 0 ? '$0' : `$${value.toFixed(4)}`;
  }

  if (metricKey === 'tokens') {
    return value.toLocaleString();
  }

  return `${Math.round(value).toLocaleString()} ms`;
};

/**
 * Placeholder navigation URL.
 *
 * Change this function when the final traces route is available.
 */
const buildTracesHref = ({
  experimentId,
  traces,
}: {
  experimentId?: string;
  traces: TraceDetail[];
}): string => {
  const params = new URLSearchParams({
    tab: 'traces',
  });

  const traceIds = traces
    .map(trace => trace.id)
    .filter(Boolean)
    .join(',');

  if (traceIds) {
    params.set('traceIds', traceIds);
  }

  return experimentId
    ? `/${encodeURIComponent(
        experimentId,
      )}/monitoring?${params.toString()}`
    : `/monitoring?${params.toString()}`;
};

const renderTooltip = ({
  title,
  subtitle,
  meta,
  traceCount,
  traces,
  experimentId,
  palette,
  sanitize,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  traceCount: number;
  traces: TraceDetail[];
  experimentId?: string;
  palette: WorkflowTooltipPalette;
  sanitize: (value: unknown) => string;
}): string => {
  //use when transision to link
  const href = buildTracesHref({
    experimentId,
    traces,
  });

  return `
    ${tooltipStyles}

    <div
      class="${WF_INFO_TIP_CLASS}"
      style="
        width:max-content;
        max-width:320px;
        padding:8px 10px;
        white-space:normal;
        box-sizing:border-box;
        font-family:inherit;
        font-size:0.68rem;
        line-height:1.35;
        background:${palette.bg};
        color:${palette.text};
        border:1px solid ${palette.border};
        border-radius:8px;
        box-shadow:${palette.shadow};
      "
    >
      <div style="font-weight:800;">
        ${sanitize(title)}
      </div>

      ${
        subtitle
          ? `
            <div
              style="
                margin-top:2px;
                color:${palette.secondaryText};
              "
            >
              ${sanitize(subtitle)}
            </div>
          `
          : ''
      }

      ${
        meta
          ? `
            <div
              style="
                margin-top:3px;
                color:${palette.secondaryText};
              "
            >
              ${sanitize(meta)}
            </div>
          `
          : ''
      }
        <span
          style="
            display:block;
            margin-top:6px;
            padding-top:5px;
            border-top:1px solid ${palette.border};
            color:${palette.link};
            font-weight:800;
            cursor:default;
          "
        >        
          View: ${traceCount.toLocaleString()}
          ${traceCount === 1 ? 'trace' : 'traces'}
      </span>
    </div>
  `;
};

export const buildTraceHourBuckets = (
  details: TraceDetail[],
): TraceHourBuckets => {
  const times = details
    .map(traceDate)
    .filter((date): date is Date => date !== null)
    .map(date => date.getTime());

  const spanMs = times.length
    ? Math.max(...times) - Math.min(...times)
    : 0;

  const bucketMs = pickBucketMs(spanMs);

  const tracesByHour = new Map<
    string,
    TraceDetail[]
  >();

  details.forEach(trace => {
    const date = traceDate(trace);

    if (!date) return;

    const bucketStart =
      Math.floor(date.getTime() / bucketMs) * bucketMs;
    const hourKey = String(bucketStart);
    const bucket =
      tracesByHour.get(hourKey) ?? [];

    bucket.push(trace);
    tracesByHour.set(hourKey, bucket);
  });

  const hourKeys = [
    ...tracesByHour.keys(),
  ].sort(
    (first, second) =>
      Number(first) - Number(second),
  );

  const includeDate =
    new Set(
      hourKeys.map(hourKey =>
        dayKey(new Date(Number(hourKey))),
      ),
    ).size > 1;

  const rows = hourKeys.map(hourKey => {
    const date = new Date(Number(hourKey));

    return {
      hourKey,
      hourStart: date.toISOString(),
      hourLabel: formatBucketLabel(
        date,
        bucketMs,
        includeDate,
      ),
      traces:
        tracesByHour.get(hourKey)?.length ??
        0,
    };
  });

  return {
    rows,
    tracesByHour,
  };
};

export const createTraceHourTooltipHandler = ({
  tracesByHour,
  experimentId,
  palette,
}: {
  tracesByHour: Map<string, TraceDetail[]>;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}) => {
  const handler = new Handler({
    sanitize: escapeHtml,

    formatTooltip: (
      value: Record<string, unknown>,
      sanitize,
    ) => {
      const hourKey = String(
        value.hourKey ??
          value['Hour key'] ??
          value['Hour Key'] ??
          '',
      );

      const traces =
        tracesByHour.get(hourKey) ?? [];

      return renderTooltip({
        title: formatTooltipHour(
          hourKey
            ? new Date(Number(hourKey))
            : null,
        ),
        traceCount: traces.length,
        traces,
        experimentId,
        palette,
        sanitize,
      });
    },
  });

  return handler.call;
};

const distributionNumberKey = (
  value: unknown,
): string => {
  const number = toNumber(value);

  if (number === null) return '';

  return Number.isInteger(number)
    ? String(number)
    : number.toPrecision(12);
};

const distributionBucketKey = ({
  metricKey,
  value,
  bySession,
  sessionLabel,
}: {
  metricKey: TraceDistributionMetricKey;
  value: unknown;
  bySession: boolean;
  sessionLabel?: unknown;
}): string =>
  [
    metricKey,
    distributionNumberKey(value),
    bySession
      ? String(sessionLabel ?? 'unknown')
      : '__all__',
  ].join('::');

export const buildTraceDistributionBuckets = ({
  chartRows,
  details,
  metricKey,
  bySession,
}: {
  chartRows: TraceDistributionMetricRow[];
  details: TraceDetail[];
  metricKey: TraceDistributionMetricKey;
  bySession: boolean;
}) => {
  const tracesById = new Map(
    details.map(trace => [
      String(trace.id),
      trace,
    ]),
  );

  const tracesByBucket = new Map<
    string,
    TraceDetail[]
  >();

  chartRows.forEach(row => {
    const metricValue = toNumber(
      row[metricKey],
    );

    const traceId = String(
      row.traceId ?? row.id ?? '',
    );

    const trace = tracesById.get(traceId);

    if (!trace || metricValue === null) {
      return;
    }

    const bucketKey =
      distributionBucketKey({
        metricKey,
        value: metricValue,
        bySession,
        sessionLabel: row.sessionLabel,
      });

    const bucket =
      tracesByBucket.get(bucketKey) ?? [];

    bucket.push(trace);
    tracesByBucket.set(bucketKey, bucket);
  });

  return tracesByBucket;
};

export const createTraceDistributionTooltipHandler =
  ({
    tracesByBucket,
    metricKey,
    metricTitle,
    bySession,
    experimentId,
    palette,
  }: {
    tracesByBucket: Map<
      string,
      TraceDetail[]
    >;
    metricKey: TraceDistributionMetricKey;
    metricTitle: string;
    bySession: boolean;
    experimentId?: string;
    palette: WorkflowTooltipPalette;
  }) => {
    const handler = new Handler({
      sanitize: escapeHtml,

      formatTooltip: (
        value: Record<string, unknown>,
        sanitize,
      ) => {
        const metricValue = toNumber(
          value[metricKey],
        );

        const sessionLabel =
          value.sessionLabel;

        const bucketKey =
          distributionBucketKey({
            metricKey,
            value: metricValue,
            bySession,
            sessionLabel,
          });

        const traces =
          tracesByBucket.get(bucketKey) ??
          [];

        const traceCount =
          toNumber(value.traceCount) ??
          traces.length;

        const cumulativeTraces = toNumber(
          value.cumulativeTraces,
        );

        const percentOfTraces = toNumber(
          value.percentOfTraces,
        );

        const meta = [
          `${traceCount.toLocaleString()} ${
            traceCount === 1
              ? 'trace'
              : 'traces'
          } at this value`,

          cumulativeTraces !== null
            ? `${cumulativeTraces.toLocaleString()} ${
                cumulativeTraces === 1
                  ? 'trace'
                  : 'traces'
              } ≤ value`
            : null,

          percentOfTraces !== null
            ? `${percentOfTraces.toFixed(1)}%`
            : null,
        ]
          .filter(
            (part): part is string =>
              part !== null,
          )
          .join(' · ');

        return renderTooltip({
          title: `${metricTitle}: ${formatMetric(
            metricValue,
            metricKey,
          )}`,

          subtitle: bySession
            ? `Session: ${String(
                sessionLabel ?? '—',
              )}`
            : undefined,

          meta,
          traceCount,
          traces,
          experimentId,
          palette,
          sanitize,
        });
      },
    });

    return handler.call;
  };