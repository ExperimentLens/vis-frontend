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
}

const TONE_LABEL: Record<ScoreTone, string> = { good: 'At or above pass mark', warn: 'Just below', bad: 'Well below' };
const ROW_HEIGHT = 34;

/** Configuration × metric grid of mean scores, colored against each metric's pass mark. */
export default function EvalHeatmapCard({ rows, metrics, param }: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const height = rows.length * ROW_HEIGHT + 90;
  const safetyCount = metrics.filter(isSafetyEval).length;

  const spec = useMemo(() => {
    const columns = metrics.map(evalLabel);
    const values = rows.flatMap(row =>
      metrics
        .filter(m => row.scores[m])
        .map(m => {
          const s = row.scores[m];

          return {
            group: row.group,
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
          mark: { type: 'rect', cornerRadius: 3, stroke: theme.palette.background.paper, strokeWidth: 2 },
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
            opacity: { field: 'mean', type: 'quantitative', scale: { domain: [0, 1], range: [0.55, 0.9] }, legend: null },
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
      ],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [rows, metrics, param, theme, themeConfig]);

  return (
    <ResponsiveCardVegaLite
      title="Evaluation scores"
      details={`Mean per ${param || 'group'}, best on top · 0–1, higher is better${safetyCount ? ` · last ${safetyCount} columns are safety checks` : ''}`}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
      showSettings={false}
      minHeight={height}
      maxHeight={height}
      aspectRatio={3}
    />
  );
}
