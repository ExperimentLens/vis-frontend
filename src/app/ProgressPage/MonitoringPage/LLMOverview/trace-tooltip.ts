import { Handler } from 'vega-tooltip';

import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import type { Observation } from '../../../../shared/models/observability/observation';
import { WF_INFO_TIP_CLASS } from '../ComparativeAnalysis/workflow-info-tooltip';
import type { WorkflowTooltipPalette } from '../ComparativeAnalysis/workflow-info-tooltip';

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

export type TraceDistributionMetricKey = 'latencyMs' | 'cost' | 'tokens';

export type TraceDistributionMetricRow = Record<string, unknown> & {
  id?: string;
  traceId?: string;
  sessionId?: string | null;
  sessionLabel?: string;
};

const pinnedTooltipHeaderFix = `
  <style>
    .vega-tooltip-pinned .${WF_INFO_TIP_CLASS} {
      padding-top: 34px !important;
      pointer-events: auto !important;
    }

    .vega-tooltip-pinned .${WF_INFO_TIP_CLASS} a {
      pointer-events: auto !important;
    }
  </style>
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const escapeHtml = (value: unknown) => {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const traceDate = (trace: TraceDetail): Date | null =>
  parseDate(trace.timestamp);

const floorToHour = (date: Date) => {
  const copy = new Date(date);

  copy.setMinutes(0, 0, 0);

  return copy;
};

export const dayKey = (date: Date) => {
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

const formatTooltipHour = (date: Date | null) => {
  if (!date) return 'Unknown hour';

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTooltipTime = (date: Date | null) => {
  if (!date) return '—';

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const numericValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const nestedValue = (value: unknown, keys: string[]) => {
  let current = value;

  for (const key of keys) {
    if (!isRecord(current)) return undefined;

    current = current[key];
  }

  return current;
};

const compactText = (value: unknown, maxLength = 180) => {
  if (value === null || value === undefined || value === '') return '—';

  let text: string;

  if (typeof value === 'object') {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  } else {
    text = String(value);
  }

  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 1)}…`;
};

const traceQuestion = (trace: TraceDetail) =>
  nestedValue(trace.input, ['question']) ??
  nestedValue(trace.input, ['prompt']) ??
  trace.input ??
  '—';

const traceAnswer = (trace: TraceDetail) =>
  nestedValue(trace.output, ['answer']) ??
  nestedValue(trace.output, ['response']) ??
  nestedValue(trace.output, ['text']) ??
  trace.output ??
  '—';

const outputTokens = (output: unknown): number => {
  if (!isRecord(output)) return 0;

  const direct =
    numericValue(output.total_tokens) ??
    numericValue(output.totalTokens) ??
    numericValue(output.tokenCount) ??
    numericValue(output.token_count);

  if (direct !== null) return direct;

  const tokens = output.tokens;

  if (!isRecord(tokens)) return 0;

  return (
    numericValue(tokens.total_tokens) ??
    numericValue(tokens.totalTokens) ??
    numericValue(tokens.total) ??
    0
  );
};

const observationTokens = (observation: Observation): number =>
  outputTokens(observation.output);

const traceTokens = (trace: TraceDetail): number | null => {
  const total = trace.observations.reduce(
    (sum, observation) => sum + observationTokens(observation),
    0,
  );

  if (total > 0) return total;

  const rootTokens = outputTokens(trace.output);

  return rootTokens > 0 ? rootTokens : null;
};

const traceModels = (trace: TraceDetail): string => {
  const models = Array.from(
    new Set(
      trace.observations
        .flatMap(observation => [
          observation.model,
          nestedValue(observation.input, ['model']),
          nestedValue(observation.output, ['model']),
        ])
        .filter(Boolean)
        .map(String),
    ),
  );

  return models.length ? models.join(', ') : '—';
};

const traceStatus = (trace: TraceDetail): string => {
  const errored = trace.observations.find(observation => {
    const level = observation.level?.toUpperCase?.() ?? '';
    const statusMessage = observation.statusMessage?.toUpperCase?.() ?? '';

    return level.includes('ERROR') || statusMessage.includes('ERROR');
  });

  if (errored) {
    return errored.statusMessage
      ? `ERROR: ${errored.statusMessage}`
      : 'ERROR';
  }

  const level = trace.observations.find(observation => observation.level)?.level;

  return level || '—';
};

const observationSummary = (trace: TraceDetail): string => {
  if (!trace.observations.length) return '0 observations';

  const counts = trace.observations.reduce<Record<string, number>>(
    (acc, observation) => {
      const type = observation.type || 'UNKNOWN';

      acc[type] = (acc[type] ?? 0) + 1;

      return acc;
    },
    {},
  );

  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}`)
    .join(' · ');
};

const traceWorkflowId = (trace: TraceDetail) => trace.sessionId ?? '—';

const formatLatency = (seconds: number | null) => {
  if (seconds === null) return '—';

  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;

  if (seconds < 60) return `${seconds.toFixed(2)} s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
};

const formatCost = (value: number | null) => {
  if (value === null) return '—';

  if (value === 0) return '$0';

  return `$${value.toFixed(4)}`;
};

const buildWorkflowLink = ({
  experimentId,
  workflowId,
  palette,
}: {
  experimentId?: string;
  workflowId: unknown;
  palette: WorkflowTooltipPalette;
}) => {
  const workflowText = compactText(workflowId, 80);

  if (!experimentId || workflowText === '—') {
    return escapeHtml(workflowText);
  }

  return `<a href="/${escapeHtml(experimentId)}/workflow?workflowId=${encodeURIComponent(
    workflowText,
  )}" style="color:${palette.link};text-decoration:none;font-weight:700;">${escapeHtml(
    workflowText,
  )}</a>`;
};

const renderTraceCards = ({
  traces,
  experimentId,
  palette,
  sanitize,
}: {
  traces: TraceDetail[];
  experimentId?: string;
  palette: WorkflowTooltipPalette;
  sanitize: (value: unknown) => string;
}) =>
  traces
    .map(trace => {
      const time = formatTooltipTime(traceDate(trace));
      const workflowId = traceWorkflowId(trace);
      const latency = formatLatency(numericValue(trace.latency));
      const cost = formatCost(numericValue(trace.totalCost));
      const tokens = traceTokens(trace);
      const model = traceModels(trace);
      const status = traceStatus(trace);
      const observations = observationSummary(trace);
      const question = compactText(traceQuestion(trace), 170);
      const answer = compactText(traceAnswer(trace), 190);

      return `
        <div style="padding:8px 0;border-bottom:1px solid ${palette.border};">
          <div style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;">
            <div style="min-width:0;">
              <div style="font-weight:800;font-size:0.72rem;">
                ${sanitize(trace.name || 'Trace')}
              </div>

              <div style="font-size:0.66rem;color:${palette.secondaryText};margin-top:2px;">
                ${sanitize(time)} · Workflow: ${buildWorkflowLink({
                  experimentId,
                  workflowId,
                  palette,
                })}
              </div>
            </div>

            <div style="font-size:0.66rem;color:${palette.secondaryText};white-space:nowrap;margin-right:4px">
              ${sanitize(status)}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3, max-content);gap:4px 12px;margin-top:8px;font-size:0.66rem;">
            <div><strong>Latency:</strong> ${sanitize(latency)}</div>
            <div><strong>Tokens:</strong> ${sanitize(tokens !== null ? tokens.toLocaleString() : '—')}</div>
            <div><strong>Cost:</strong> ${sanitize(cost)}</div>
          </div>

          <div style="margin-top:6px;font-size:0.62rem;color:${palette.secondaryText};">
            <strong>Id:</strong> ${sanitize(trace.id)}
          </div>

          <div style="margin-top:6px;font-size:0.66rem;color:${palette.secondaryText};">
            <strong>Model:</strong> ${sanitize(model)}
          </div>

          <div style="margin-top:4px;font-size:0.66rem;color:${palette.secondaryText};">
            <strong>Observations:</strong> ${sanitize(observations)}
          </div>

          <div style="margin-top:8px;font-size:0.68rem;">
            <strong>Q:</strong> ${sanitize(question)}
          </div>

          <div style="margin-top:4px;font-size:0.68rem;">
            <strong>A:</strong> ${sanitize(answer)}
          </div>
        </div>
      `;
    })
    .join('');

const renderTraceTooltip = ({
  title,
  subtitle,
  meta,
  traces,
  emptyMessage,
  experimentId,
  palette,
  sanitize,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  traces: TraceDetail[];
  emptyMessage: string;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
  sanitize: (value: unknown) => string;
}) => {
  const header = `
    <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid ${palette.border};">
      <div style="font-size:0.72rem;font-family:inherit;font-weight:800;">
        ${sanitize(title)}
      </div>

      ${
        subtitle
          ? `
            <div style="font-size:0.68rem;font-family:inherit;color:${palette.secondaryText};margin-top:2px;">
              ${sanitize(subtitle)}
            </div>
          `
          : ''
      }

      ${
        meta
          ? `
            <div style="font-size:0.68rem;font-family:inherit;color:${palette.secondaryText};margin-top:2px;">
              ${sanitize(meta)}
            </div>
          `
          : ''
      }
    </div>
  `;

  if (traces.length === 0) {
    return `
      ${pinnedTooltipHeaderFix}
      <div class="${WF_INFO_TIP_CLASS}" style="max-width:420px;white-space:normal;background-color:${palette.bg};color:${palette.text};border:1px solid ${palette.border};border-radius:8px;padding:8px;box-shadow:${palette.shadow};">
        ${header}
        <div style="color:${palette.secondaryText};font-style:italic;">
          ${sanitize(emptyMessage)}
        </div>
      </div>
    `;
  }

  return `
    ${pinnedTooltipHeaderFix}
    <div class="${WF_INFO_TIP_CLASS}" style="max-width:560px;max-height:420px;white-space:normal;display:flex;flex-direction:column;background-color:${palette.bg};color:${palette.text};border:1px solid ${palette.border};border-radius:8px;padding:8px 10px;box-shadow:${palette.shadow};font-size:0.72rem;font-family:inherit;box-sizing:border-box;">
      ${header}

      <div style="overflow:auto;min-height:0;padding-right:2px;">
        ${renderTraceCards({
          traces,
          experimentId,
          palette,
          sanitize,
        })}
      </div>
    </div>
  `;
};

export const buildTraceHourBuckets = (
  details: TraceDetail[],
): TraceHourBuckets => {
  const tracesByHour = new Map<string, TraceDetail[]>();

  details.forEach(trace => {
    const date = traceDate(trace);

    if (!date) return;

    const hourMs = floorToHour(date).getTime();
    const hourKey = String(hourMs);

    tracesByHour.set(hourKey, [
      ...(tracesByHour.get(hourKey) ?? []),
      trace,
    ]);
  });

  const sortedHours = [...tracesByHour.keys()].sort(
    (a, b) => Number(a) - Number(b),
  );

  const uniqueDays = new Set(
    sortedHours.map(hour => dayKey(new Date(Number(hour)))),
  );

  const showDate = uniqueDays.size > 1;

  const rows = sortedHours.map(hourKey => {
    const date = new Date(Number(hourKey));
    const traces = tracesByHour.get(hourKey)?.length ?? 0;

    return {
      hourKey,
      hourStart: date.toISOString(),
      hourLabel: formatHourLabel(date, showDate),
      traces,
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
    formatTooltip: (value: Record<string, unknown>, sanitize) => {
      const rawHourKey =
        value.hourKey ??
        value['hourKey'] ??
        value['Hour key'] ??
        value['Hour Key'];

      const hourKey = String(rawHourKey ?? '');
      const traces = tracesByHour.get(hourKey) ?? [];
      const hourDate = hourKey ? new Date(Number(hourKey)) : null;

      return renderTraceTooltip({
        title: formatTooltipHour(hourDate),
        subtitle: `${traces.length} trace${traces.length === 1 ? '' : 's'} in this hour`,
        traces,
        emptyMessage: 'No traces found for this hour.',
        experimentId,
        palette,
        sanitize,
      });
    },
  });

  return handler.call;
};

const traceDistributionNumberKey = (value: unknown) => {
  const number = numericValue(value);

  if (number === null) return '';

  return Number.isInteger(number) ? String(number) : number.toPrecision(12);
};

const traceMetricRowId = (row: TraceDistributionMetricRow) => {
  const id = row.traceId ?? row.id;

  return id === undefined || id === null ? '' : String(id);
};

const traceDistributionBucketKey = ({
  metricKey,
  value,
  bySession,
  sessionLabel,
}: {
  metricKey: TraceDistributionMetricKey;
  value: unknown;
  bySession: boolean;
  sessionLabel?: unknown;
}) =>
  [
    metricKey,
    traceDistributionNumberKey(value),
    bySession ? String(sessionLabel ?? 'unknown') : '__all__',
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
  const tracesById = new Map(details.map(trace => [String(trace.id), trace]));
  const tracesByBucket = new Map<string, TraceDetail[]>();

  chartRows.forEach(row => {
    const metricValue = numericValue(row[metricKey]);

    if (metricValue === null) return;

    const traceId = traceMetricRowId(row);
    const trace = tracesById.get(traceId);

    if (!trace) return;

    const bucketKey = traceDistributionBucketKey({
      metricKey,
      value: metricValue,
      bySession,
      sessionLabel: row.sessionLabel,
    });

    tracesByBucket.set(bucketKey, [
      ...(tracesByBucket.get(bucketKey) ?? []),
      trace,
    ]);
  });

  return tracesByBucket;
};

const formatDistributionMetricValue = (
  value: number | null,
  metricKey: TraceDistributionMetricKey,
) => {
  if (value === null) return '—';

  if (metricKey === 'cost') return formatCost(value);
  if (metricKey === 'tokens') return value.toLocaleString();

  return `${Math.round(value).toLocaleString()} ms`;
};

export const createTraceDistributionTooltipHandler = ({
  tracesByBucket,
  metricKey,
  metricTitle,
  bySession,
  experimentId,
  palette,
}: {
  tracesByBucket: Map<string, TraceDetail[]>;
  metricKey: TraceDistributionMetricKey;
  metricTitle: string;
  bySession: boolean;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}) => {
  const handler = new Handler({
    sanitize: escapeHtml,
    formatTooltip: (value: Record<string, unknown>, sanitize) => {
      const metricValue = numericValue(value[metricKey]);
      const sessionLabel = value.sessionLabel;

      const bucketKey = traceDistributionBucketKey({
        metricKey,
        value: metricValue,
        bySession,
        sessionLabel,
      });

      const traces = tracesByBucket.get(bucketKey) ?? [];

      const traceCount = numericValue(value.traceCount) ?? traces.length;
      const cumulativeTraces = numericValue(value.cumulativeTraces);
      const percentOfTraces = numericValue(value.percentOfTraces);

      const metaParts = [
        `${traceCount.toLocaleString()} trace${traceCount === 1 ? '' : 's'} at this value`,
        cumulativeTraces !== null
          ? `${cumulativeTraces.toLocaleString()} trace${cumulativeTraces === 1 ? '' : 's'} ≤ value`
          : null,
        percentOfTraces !== null ? `${percentOfTraces.toFixed(1)}%` : null,
      ].filter(Boolean);

      return renderTraceTooltip({
        title: `${metricTitle}: ${formatDistributionMetricValue(metricValue, metricKey)}`,
        subtitle: bySession ? `Session: ${compactText(sessionLabel, 120)}` : undefined,
        meta: metaParts.join(' · '),
        traces,
        emptyMessage: 'No traces found for this distribution point.',
        experimentId,
        palette,
        sanitize,
      });
    },
  });

  return handler.call;
};