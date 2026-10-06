import type { FrontierPoint, GroupComparison, Verdict } from '../../../../shared/utils/run-statistics';

export const VERDICT_ORDER: Verdict[] = ['best', 'tie', 'worse', 'insufficient'];

export const VERDICT_LABEL: Record<Verdict, string> = {
  best: 'Best',
  tie: 'No significant difference',
  worse: 'Significantly worse',
  insufficient: 'Needs more runs',
};

/** Horizontal dot-and-whisker chart: mean and 95% CI of the metric per param value. */
export function comparisonSpec(
  groups: GroupComparison[],
  param: string,
  metric: string,
  colors: { verdicts: Record<Verdict, string>; interval: string },
): Record<string, unknown> {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: groups.map(g => ({
        value: g.value,
        mean: g.mean,
        ciLow: g.ciLow,
        ciHigh: g.ciHigh,
        n: g.n,
        verdict: VERDICT_LABEL[g.verdict],
      })),
    },
    encoding: {
      y: { field: 'value', type: 'nominal', title: param, sort: groups.map(g => g.value), axis: { labelLimit: 180 } },
    },
    layer: [
      {
        mark: { type: 'rule', strokeWidth: 2 },
        encoding: {
          x: { field: 'ciLow', type: 'quantitative', title: `${metric} (mean, 95% CI)`, scale: { zero: false } },
          x2: { field: 'ciHigh' },
          color: { value: colors.interval },
        },
      },
      {
        mark: { type: 'point', filled: true, size: 90 },
        encoding: {
          x: { field: 'mean', type: 'quantitative' },
          color: {
            field: 'verdict',
            type: 'nominal',
            title: null,
            scale: {
              domain: VERDICT_ORDER.map(v => VERDICT_LABEL[v]),
              range: VERDICT_ORDER.map(v => colors.verdicts[v]),
            },
            legend: { orient: 'bottom' },
          },
          tooltip: [
            { field: 'value', title: param },
            { field: 'mean', title: 'mean', format: '.4~g' },
            { field: 'ciLow', title: '95% CI low', format: '.4~g' },
            { field: 'ciHigh', title: '95% CI high', format: '.4~g' },
            { field: 'n', title: 'runs' },
            { field: 'verdict', title: 'verdict' },
          ],
        },
      },
    ],
    config: { view: { stroke: null } },
  };
}

/** Scatter of two metrics with the Pareto frontier drawn through the optimal runs. */
export function tradeoffSpec(
  points: FrontierPoint[],
  xMetric: string,
  yMetric: string,
  colors: { optimal: string; dominated: string },
): Record<string, unknown> {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: points.map(p => ({ ...p, group: p.optimal ? 'Pareto-optimal' : 'Dominated' })),
    },
    layer: [
      {
        transform: [{ filter: 'datum.optimal' }],
        mark: { type: 'line', strokeDash: [4, 3], interpolate: 'linear' },
        encoding: {
          x: { field: 'x', type: 'quantitative', sort: 'ascending' },
          y: { field: 'y', type: 'quantitative' },
          color: { value: colors.optimal },
        },
      },
      {
        mark: { type: 'point', filled: true, size: 70, opacity: 0.85 },
        encoding: {
          x: { field: 'x', type: 'quantitative', title: xMetric, scale: { zero: false } },
          y: { field: 'y', type: 'quantitative', title: yMetric, scale: { zero: false } },
          color: {
            field: 'group',
            type: 'nominal',
            title: null,
            scale: { domain: ['Pareto-optimal', 'Dominated'], range: [colors.optimal, colors.dominated] },
            legend: { orient: 'bottom' },
          },
          tooltip: [
            { field: 'name', title: 'run' },
            { field: 'x', title: xMetric, format: '.4~g' },
            { field: 'y', title: yMetric, format: '.4~g' },
            { field: 'group', title: 'status' },
          ],
        },
      },
    ],
    config: { view: { stroke: null } },
  };
}
