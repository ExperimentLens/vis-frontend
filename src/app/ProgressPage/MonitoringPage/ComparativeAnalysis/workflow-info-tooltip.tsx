import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { Handler } from 'vega-tooltip';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import type { IRun } from '../../../../shared/models/experiment/run.model';

/**
 * Single source of truth for the "workflow info" popover shown in the
 * comparison views. Both the React MUI tooltip (models card titles) and the
 * Vega-Lite hover tooltip (metrics charts) render the SAME themed HTML via
 * {@link buildWorkflowInfoHTML}, so they share one design + coloring scheme.
 */

export interface WorkflowTooltipRow {
  id: string;
  color?: string;
  value?: number | null;
  valueText?: string;
  params: { name: string; value: string }[];
}

export interface WorkflowTooltipPalette {
  bg: string;
  text: string;
  secondaryText: string;
  border: string;
  link: string;
  shadow: string;
}

export const paletteFromTheme = (theme: Theme): WorkflowTooltipPalette => ({
  bg: theme.palette.background.paper,
  text: theme.palette.text.primary,
  secondaryText: theme.palette.text.secondary,
  border: theme.palette.customSurface.cardBorder,
  link: theme.palette.primary.main,
  shadow: theme.customShadows.popover,
});

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Marker class used to scope the Vega tooltip container override (see theme CssBaseline). */
export const WF_INFO_TIP_CLASS = 'wf-info-tip';

export function buildWorkflowInfoHTML(opts: {
  rows: WorkflowTooltipRow[];
  experimentId: string;
  palette: WorkflowTooltipPalette;
  showValue?: boolean;
  valueLabel?: string;
  /** Optional bold title line, e.g. "Metric: accuracy". */
  title?: string;
  /** Optional muted line above the table, e.g. "Step: 5". */
  topLine?: string;
}): string {
  const { rows, experimentId, palette, showValue = false, valueLabel = 'Value', title, topLine } = opts;

  const paramNames = Array.from(
    new Set(rows.flatMap(r => r.params.map(p => p.name))),
  ).sort();

  const th = (label: string, align: 'left' | 'right' = 'left') =>
    `<th style="text-align:${align};padding:3px 8px;font-weight:700;color:${palette.secondaryText};white-space:nowrap;">${esc(label)}</th>`;

  const headerCells = [
    th('Workflow'),
    ...(showValue ? [th(valueLabel, 'right')] : []),
    ...paramNames.map(n => th(n)),
  ].join('');

  const body = rows
    .map(row => {
      const pmap = new Map(row.params.map(p => [p.name, p.value]));
      const paramTds = paramNames
        .map(
          n =>
            `<td style="padding:3px 8px;vertical-align:top;color:${palette.text};">${esc(pmap.get(n) ?? '')}</td>`,
        )
        .join('');
      const valueTd = showValue
        ? `<td style="padding:3px 8px;text-align:right;vertical-align:top;color:${palette.text};font-variant-numeric:tabular-nums;">${
            row.valueText ?? (typeof row.value === 'number' ? esc(row.value.toFixed(4)) : '—')
          }</td>`
        : '';
      const swatch = `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background-color:${esc(row.color ?? palette.link)};margin-right:6px;vertical-align:middle;flex-shrink:0;"></span>`;

      return `<tr>
        <td style="white-space:nowrap;vertical-align:top;padding:3px 8px;">
          ${swatch}<a href="/${esc(experimentId)}/workflow?workflowId=${encodeURIComponent(row.id)}" style="color:${palette.link};text-decoration:none;font-weight:600;">${esc(row.id)}</a>
        </td>
        ${valueTd}${paramTds}
      </tr>`;
    })
    .join('');

  return `<div class="${WF_INFO_TIP_CLASS}" style="background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};border-radius:8px;padding:8px 10px;box-shadow:${palette.shadow};font-size:0.72rem;font-family:inherit;display:inline-block;white-space:normal;box-sizing:border-box;">
    ${topLine ? `<div style="margin-bottom:4px;color:${palette.secondaryText};font-weight:600;">${esc(topLine)}</div>` : ''}
    ${title ? `<div style="margin-bottom:6px;font-weight:700;">${esc(title)}</div>` : ''}
    <table style="border-collapse:collapse;font-size:0.72rem;">
      <thead><tr style="border-bottom:1px solid ${palette.border};">${headerCells}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

/**
 * React MUI tooltip content (models card titles). Renders the same themed HTML
 * as the Vega tooltip. The wrapping `<Tooltip>` should be a transparent
 * passthrough (the box below carries its own surface).
 */
const WorkflowInfoTooltip = ({ workflowId }: { workflowId: string }) => {
  const theme = useTheme();
  const { workflows } = useAppSelector((state: RootState) => state.progressPage);
  const experimentId = useAppSelector(
    (state: RootState) => state.progressPage.experiment.data?.id || '',
  );
  const workflowColors = useAppSelector(
    (state: RootState) => state.monitorPage.workflowsTable.workflowColors,
  );
  const workflow = workflows.data?.find(w => w.id === workflowId);

  if (!workflow) return null;

  const html = buildWorkflowInfoHTML({
    rows: [{ id: workflowId, color: workflowColors[workflowId], params: workflow.params }],
    experimentId,
    palette: paletteFromTheme(theme),
  });

  return <Box sx={{ display: 'inline-block' }} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default WorkflowInfoTooltip;

/* ─────────────────────────── Vega (metrics) handler ─────────────────────────── */

type SeriesPoint = {
  id: string;
  value: number;
  step?: number | string;
  timestamp?: string;
  [k: string]: unknown;
};

/**
 * Vega-tooltip handler for the metrics charts — renders the same themed table
 * as {@link WorkflowInfoTooltip} via the shared {@link buildWorkflowInfoHTML}.
 */
export function createWorkflowTooltipHandler(opts: {
  metricName: string;
  metricSeries: SeriesPoint[];
  isLineChart: boolean;
  xField: 'id' | 'step' | 'timestamp';
  workflowsData: IRun[];
  experimentId: string;
  palette: WorkflowTooltipPalette;
  colorMapping?: Record<string, string>;
}) {
  const {
    metricName,
    metricSeries,
    isLineChart,
    xField,
    workflowsData,
    experimentId,
    palette,
    colorMapping = {},
  } = opts;

  const toSeriesPointLike = (v: Record<string, unknown>): SeriesPoint => ({
    id: String(v.id ?? v.Workflow ?? v.workflow ?? v.wf ?? ''),
    value: Number(v.value ?? v.Value ?? v.val ?? v.metric),
    step: (v.step ?? v.Step) as number | string | undefined,
    timestamp: v.timestamp ? String(v.timestamp) : undefined,
    ...v,
  });

  return new Handler({
    sanitize: (v: unknown) => String(v),
    formatTooltip: (value: Record<string, unknown>) => {
      const raw = toSeriesPointLike(value);

      const matched: SeriesPoint[] = !isLineChart
        ? metricSeries.filter(d => d.id === raw.id)
        : metricSeries.filter(d => d[xField] === raw[xField]);

      const rows: WorkflowTooltipRow[] = matched.map(row => ({
        id: row.id,
        color: colorMapping[row.id],
        value: typeof row.value === 'number' ? row.value : null,
        params: workflowsData.find(w => w.id === row.id)?.params ?? [],
      }));

      return buildWorkflowInfoHTML({
        rows,
        experimentId,
        palette,
        showValue: true,
        title: `Metric: ${metricName}`,
        topLine: isLineChart
          ? `${xField === 'step' ? 'Step' : 'Timestamp'}: ${String(raw[xField] ?? '')}`
          : undefined,
      });
    },
  }).call;
}

type LLMSummaryMetricPoint = {
  id: string;
  value: number;
  runName?: string;
  [k: string]: unknown;
};

export function createLLMSummaryMetricTooltipHandler(opts: {
  metricName: string;
  summaryData: LLMSummaryMetricPoint[];
  workflowsData: IRun[];
  experimentId: string;
  palette: WorkflowTooltipPalette;
  colorMapping?: Record<string, string>;
}) {
  const {
    metricName,
    summaryData,
    workflowsData,
    experimentId,
    palette,
    colorMapping = {},
  } = opts;

  const getHoveredId = (v: Record<string, unknown>) =>
    String(
      v.id ??
      v.Workflow ??
      v.workflow ??
      v['Workflow ID'] ??
      v['workflow id'] ??
      '',
    );

  return new Handler({
    sanitize: (v: unknown) => String(v),
    formatTooltip: (value: Record<string, unknown>) => {
      const hoveredId = getHoveredId(value);

      const matched = summaryData.filter(d => String(d.id) === hoveredId);

      const rows: WorkflowTooltipRow[] = matched.map(row => ({
        id: row.id,
        color: colorMapping[row.id],
        value: typeof row.value === 'number' ? row.value : null,
        params: workflowsData.find(w => w.id === row.id)?.params ?? [],
      }));

      return buildWorkflowInfoHTML({
        rows,
        experimentId,
        palette,
        showValue: true,
        title: `Metric: ${metricName}`,
      });
    },
  }).call;
}

type WorkflowDatumTooltipPoint = {
  id: string;
  value?: number | null;
  [k: string]: unknown;
};

export function createWorkflowDatumTooltipHandler<T extends WorkflowDatumTooltipPoint>(opts: {
  title: string;
  data: T[];
  workflowsData: IRun[];
  experimentId: string;
  palette: WorkflowTooltipPalette;
  colorMapping?: Record<string, string>;
  valueLabel?: string;
  getValue?: (row: T) => number | null | undefined;
  getTopLine?: (row: T) => string | undefined;
  match?: (row: T, raw: Record<string, unknown>) => boolean;
  formatValue?: (value: number | null | undefined, row: T) => string;
  getExtraParams?: (row: T) => { name: string; value: string }[];
}) {
  const {
    title,
    data,
    workflowsData,
    experimentId,
    palette,
    colorMapping = {},
    valueLabel = 'Value',
    getValue = row => row.value,
    getTopLine,
    match = (row, raw) => String(row.id) === String(raw.id ?? ''),
    formatValue,
    getExtraParams = () => [],
  } = opts;

  return new Handler({
    sanitize: (v: unknown) => String(v),
    formatTooltip: (value: Record<string, unknown>) => {
      const matched = data.filter(row => match(row, value));
      const first = matched[0];

      const rows: WorkflowTooltipRow[] = matched.map(row => {
        const numericValue = getValue(row) ?? null;
      
        return {
          id: row.id,
          color: colorMapping[row.id],
          value: numericValue,
          valueText: formatValue ? formatValue(numericValue, row) : undefined,
          params: [
            ...getExtraParams(row),
            ...(workflowsData.find(w => w.id === row.id)?.params ?? []),
          ],
        };
      });

      return buildWorkflowInfoHTML({
        rows,
        experimentId,
        palette,
        showValue: true,
        valueLabel,
        title,
        topLine: first ? getTopLine?.(first) : undefined,
      });
    },
  }).call;
}
