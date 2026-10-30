import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import { evalLabel, evalPassMark, isSafetyEval, scoreTone } from '../../../../shared/utils/eval-quality';
import type { GroupScores, ScoreTone } from '../../../../shared/utils/eval-quality';
import { useVegaThemeConfig, useVegaTooltip } from '../LLMOverview/chart-kit';

interface Props {
  rows: GroupScores[];
  metrics: string[];
  param: string;
  /** Called with the clicked cell, to open its traces. */
  onCellClick?: (group: string, metric: string, mean: number) => void;
  /** The cell whose traces are open: outlined, with the other cells dimmed. */
  selected?: { group: string; metric: string } | null;
}

const TONE_LABEL: Record<ScoreTone, string> = { good: 'At or above pass mark', warn: 'Just below', bad: 'Well below' };
const ROW_HEIGHT = 34;

/** Configuration × metric grid of mean scores, colored against each metric's pass mark. */
export default function EvalHeatmapCard({ rows, metrics, param, onCellClick, selected }: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const height = rows.length * ROW_HEIGHT + 90;
  const safetyCount = metrics.filter(isSafetyEval).length;

  const spec = useMemo(() => {
    const isSelected = selected
      ? `datum.group === ${JSON.stringify(selected.group)} && datum.metricKey === ${JSON.stringify(selected.metric)}`
      : 'false';
    const columns = metrics.map(evalLabel);
    const values = rows.flatMap(row =>
      metrics
        .filter(m => row.scores[m])
        .map(m => {
          const s = row.scores[m];

          return {
            group: row.group,
            metricKey: m,
            metric: evalLabel(m),
            kind: isSafetyEval(m) ? 'Safety check' : 'Quality metric',
            mean: s.mean,
            tone: TONE_LABEL[scoreTone(m, s.mean)],
            passMark: evalPassMark(m),
            runs: s.n,
            ci: s.n > 1 ? `${s.ciLow.toFixed(2)}–${s.ciHigh.toFixed(2)}` : 'one run',
          };
        }),
    );

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values },
      encoding: {
        x: { field: 'metric', type: 'nominal', sort: columns, title: null, axis: { orient: 'top', labelAngle: 0, labelLimit: 120, domain: false, ticks: false } },
        y: { field: 'group', type: 'nominal', sort: rows.map(r => r.group), title: null, axis: { labelLimit: 200, domain: false, ticks: false } },
      },
      layer: [
        {
          params: [{ name: 'pick', select: { type: 'point', on: 'click', fields: ['group', 'metricKey'], clear: false } }],
          mark: { type: 'rect', cornerRadius: 3, stroke: theme.palette.background.paper, strokeWidth: 2, cursor: onCellClick ? 'pointer' : 'default' },
          encoding: {
            color: {
              field: 'tone',
              type: 'nominal',
              scale: {
                domain: Object.values(TONE_LABEL),
                range: [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main],
              },
              legend: { orient: 'bottom', title: null },
            },
            opacity: selected
              ? { condition: { test: `!(${isSelected})`, value: 0.25 }, field: 'mean', type: 'quantitative', scale: { domain: [0, 1], range: [0.55, 0.9] }, legend: null }
              : { field: 'mean', type: 'quantitative', scale: { domain: [0, 1], range: [0.55, 0.9] }, legend: null },
            tooltip: [
              { field: 'group', title: param || 'Group' },
              { field: 'metric', title: 'Metric' },
              { field: 'kind', title: 'Kind' },
              { field: 'mean', title: 'Mean score', format: '.2f' },
              { field: 'ci', title: '95% CI' },
              { field: 'passMark', title: 'Passes at' },
              { field: 'runs', title: 'Runs' },
            ],
          },
        },
        {
          mark: { type: 'text', fontSize: 11, fontWeight: 700 },
          encoding: {
            text: { field: 'mean', type: 'quantitative', format: '.2f' },
            color: { value: theme.palette.common.white },
          },
        },
        ...(selected ? [{
          transform: [{ filter: isSelected }],
          mark: { type: 'rect', cornerRadius: 3, fill: null, stroke: theme.palette.text.primary, strokeWidth: 2.5 },
        }] : []),
      ],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [rows, metrics, param, theme, themeConfig, onCellClick, selected]);

  const meanByCell = useMemo(
    () => new Map(rows.flatMap(r => metrics.filter(m => r.scores[m]).map(m => [`${r.group}\u0000${m}`, r.scores[m].mean] as const))),
    [rows, metrics],
  );
  // Vega reports a point selection as { group: [value], metricKey: [value] }.
  const signalListeners = useMemo(() => (onCellClick ? {
    pick: (_name: string, value: unknown) => {
      const v = value as { group?: string | string[]; metricKey?: string | string[] } | null;
      const group = Array.isArray(v?.group) ? v?.group[0] : v?.group;
      const metric = Array.isArray(v?.metricKey) ? v?.metricKey[0] : v?.metricKey;

      if (group && metric) onCellClick(group, metric, meanByCell.get(`${group}\u0000${metric}`) ?? 1);
    },
  } : undefined), [onCellClick, meanByCell]);

  return (
    <ResponsiveCardVegaLite
      title="Evaluation scores"
      details={`Mean per ${param || 'group'}, best on top · 0–1, higher is better${safetyCount ? ` · last ${safetyCount} columns are safety checks` : ''}${onCellClick ? ' · click a cell for its traces' : ''}`}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
      signalListeners={signalListeners}
      // A click opens the cell's traces; a tooltip pinned by the same click would sit on top of them.
      disableTooltipPin={Boolean(onCellClick)}
      showSettings={false}
      minHeight={height}
      maxHeight={height}
      aspectRatio={3}
    />
  );
}
