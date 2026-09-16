import { Handler } from 'vega-tooltip';

import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import {
  DAY_MS,
  bucketStartMs,
  dayKey,
  formatBucketAxisLabel,
  formatBucketTooltipTitle,
  pickBucketMs,
} from '../../../../shared/utils/time-buckets';
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
  isDailyBucket: boolean;
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

// Keep in sync with the TAB.TRACES value in monitoring-page.tsx.
const TRACES_TAB_INDEX = 3;

/** Marks a tooltip link as one that should be intercepted client-side — see
 * `TRACE_SELECTION_LINK_CLASS` usage in monitoring-page.tsx, which attaches a
 * single delegated click listener for this class and navigates via the
 * router. A plain onclick="" attribute was tried first, but the pinned
 * tooltip panel copies the live tooltip's HTML via `.innerHTML`, and that
 * round-trip doesn't reliably survive inline event handlers — a data
 * attribute read by a delegated listener does. */
export const TRACE_SELECTION_LINK_CLASS = 'trace-selection-link';

/**
 * Builds the monitoring-page URL a "View N traces" link should point to
 * (picked up via `traceSelectionId`) plus the trace ids to stash under that
 * key once clicked, or null when there's nothing to link to (no experiment,
 * or no traces in this bucket).
 */
const buildTraceSelectionLink = ({
  experimentId,
  traces,
}: {
  experimentId?: string;
  traces: TraceDetail[];
}): { href: string; traceIds: string[] } | null => {
  const traceIds = traces.map(trace => trace.id).filter(Boolean);

  if (!experimentId || traceIds.length === 0) return null;

  const selectionKey = `trace-select-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const href = `/${encodeURIComponent(experimentId)}/monitoring?tab=${TRACES_TAB_INDEX}&traceSelectionId=${selectionKey}`;

  return { href, traceIds };
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
  const traceSelectionLink = buildTraceSelectionLink({
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
      <div
        style="
          margin-top:6px;
          padding-top:5px;
          border-top:1px solid ${palette.border};
        "
      >
        ${
          traceSelectionLink
            ? `
              <a
                href="${traceSelectionLink.href}"
                class="${TRACE_SELECTION_LINK_CLASS}"
                data-trace-ids='${JSON.stringify(traceSelectionLink.traceIds)}'
                style="
                  color:${palette.link};
                  text-decoration:underline;
                  font-size:0.68rem;
                  font-weight:800;
                  cursor:pointer;
                "
              >
                View ${traceCount.toLocaleString()} ${traceCount === 1 ? 'trace' : 'traces'}
              </a>
            `
            : `
              <span style="color:${palette.secondaryText}; font-weight:800;">
                ${traceCount.toLocaleString()} ${traceCount === 1 ? 'trace' : 'traces'}
              </span>
            `
        }
      </div>
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

  const bucketMs = pickBucketMs(times);

  const tracesByHour = new Map<
    string,
    TraceDetail[]
  >();

  details.forEach(trace => {
    const date = traceDate(trace);

    if (!date) return;

    const hourKey = String(bucketStartMs(date.getTime(), bucketMs));
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
      hourLabel: formatBucketAxisLabel(
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
    isDailyBucket: bucketMs >= DAY_MS,
  };
};

export const createTraceHourTooltipHandler = ({
  tracesByHour,
  isDailyBucket,
  experimentId,
  palette,
}: {
  tracesByHour: Map<string, TraceDetail[]>;
  isDailyBucket: boolean;
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
        title: formatBucketTooltipTitle(
          hourKey
            ? new Date(Number(hourKey))
            : null,
          isDailyBucket,
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

const formatTokenCount = (value: number): string =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value);

const formatLatencyMs = (value: number): string => `${Math.round(value).toLocaleString()} ms`;

export const createLatencyBucketTooltipHandler = ({
  tracesByBucket,
  isDailyBucket,
  experimentId,
  palette,
}: {
  tracesByBucket: Map<string, TraceDetail[]>;
  isDailyBucket: boolean;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}) => {
  const handler = new Handler({
    sanitize: escapeHtml,

    formatTooltip: (
      value: Record<string, unknown>,
      sanitize,
    ) => {
      const bucketKeyValue = String(value.bucketKey ?? '');
      const percentile = String(value.percentile ?? '').toUpperCase();
      const latencyMs = toNumber(value.latencyMs);

      const traces = tracesByBucket.get(bucketKeyValue) ?? [];

      return renderTooltip({
        title: `${percentile}: ${latencyMs !== null ? formatLatencyMs(latencyMs) : '—'}`,
        subtitle: formatBucketTooltipTitle(
          bucketKeyValue ? new Date(Number(bucketKeyValue)) : null,
          isDailyBucket,
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

export const createTokensBucketTooltipHandler = ({
  tracesByBucket,
  isDailyBucket,
  experimentId,
  palette,
}: {
  tracesByBucket: Map<string, TraceDetail[]>;
  isDailyBucket: boolean;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}) => {
  const handler = new Handler({
    sanitize: escapeHtml,

    formatTooltip: (
      value: Record<string, unknown>,
      sanitize,
    ) => {
      const bucketKeyValue = String(value.bucketKey ?? '');
      const percentile = String(value.percentile ?? '').toUpperCase();
      const tokens = toNumber(value.tokens);

      const traces = tracesByBucket.get(bucketKeyValue) ?? [];

      return renderTooltip({
        title: `${percentile}: ${tokens !== null ? formatTokenCount(tokens) : '—'}`,
        subtitle: formatBucketTooltipTitle(
          bucketKeyValue ? new Date(Number(bucketKeyValue)) : null,
          isDailyBucket,
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

const formatCostValue = (value: number): string => (value === 0 ? '$0' : `$${value.toFixed(4)}`);

export const createCostBucketTooltipHandler = ({
  tracesByBucket,
  isDailyBucket,
  experimentId,
  palette,
}: {
  tracesByBucket: Map<string, TraceDetail[]>;
  isDailyBucket: boolean;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}) => {
  const handler = new Handler({
    sanitize: escapeHtml,

    formatTooltip: (
      value: Record<string, unknown>,
      sanitize,
    ) => {
      const bucketKeyValue = String(value.bucketKey ?? '');
      const percentile = String(value.percentile ?? '').toUpperCase();
      const cost = toNumber(value.cost);

      const traces = tracesByBucket.get(bucketKeyValue) ?? [];

      return renderTooltip({
        title: `${percentile}: ${cost !== null ? formatCostValue(cost) : '—'}`,
        subtitle: formatBucketTooltipTitle(
          bucketKeyValue ? new Date(Number(bucketKeyValue)) : null,
          isDailyBucket,
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

export const createErrorBucketTooltipHandler = ({
  tracesByBucket,
  isDailyBucket,
  experimentId,
  palette,
}: {
  tracesByBucket: Map<string, TraceDetail[]>;
  isDailyBucket: boolean;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}) => {
  const handler = new Handler({
    sanitize: escapeHtml,

    formatTooltip: (
      value: Record<string, unknown>,
      sanitize,
    ) => {
      const bucketKeyValue = String(value.bucketKey ?? '');
      const errorCount = toNumber(value.errorCount) ?? 0;
      const totalCount = toNumber(value.totalCount) ?? 0;
      const errorRate = toNumber(value.errorRate);

      const traces = tracesByBucket.get(bucketKeyValue) ?? [];

      return renderTooltip({
        title: `${errorCount.toLocaleString()} error${errorCount === 1 ? '' : 's'}`,
        subtitle: formatBucketTooltipTitle(
          bucketKeyValue ? new Date(Number(bucketKeyValue)) : null,
          isDailyBucket,
        ),
        meta: `${totalCount.toLocaleString()} traces this bucket${errorRate !== null ? ` · ${(errorRate * 100).toFixed(1)}% error rate` : ''}`,
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