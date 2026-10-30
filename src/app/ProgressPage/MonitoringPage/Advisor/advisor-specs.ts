import type { ConfigStats, Suggestion } from '../../../../shared/utils/config-advisor';
import { describeValues } from '../../../../shared/utils/config-advisor';

export interface AdvisorChartColors {
  optimal: string;
  dominated: string;
  predicted: string;
  highlight: string;
}

/**
 * Quality vs cost per configuration: measured ones as dots (frontier joined), the
 * recommended ones ringed, and the surrogate's untested suggestions as hollow diamonds
 * with their predicted interval.
 */
export function advisorSpec(
  configs: ConfigStats[],
  suggestions: Suggestion[],
  highlighted: Set<string>,
  quality: string,
  cost: string,
  colors: AdvisorChartColors,
): Record<string, unknown> {
  const measured = configs.map(c => ({
    name: c.name,
    config: describeValues(c.values),
    x: c.cost.mean,
    y: c.quality.mean,
    yLow: c.quality.ciLow,
    yHigh: c.quality.ciHigh,
    runs: c.runIds.length,
    group: c.optimal ? 'Pareto-optimal' : 'Dominated',
    optimal: c.optimal,
    highlighted: highlighted.has(c.key),
  }));
  const predicted = suggestions.map(s => ({
    name: 'untested',
    config: describeValues(s.values),
    x: s.cost.mean,
    y: s.quality.mean,
    yLow: s.quality.mean - s.quality.half,
    yHigh: s.quality.mean + s.quality.half,
    group: 'Predicted (untested)',
  }));
  const groups = ['Pareto-optimal', 'Dominated', ...(predicted.length ? ['Predicted (untested)'] : [])];
  const range = [colors.optimal, colors.dominated, colors.predicted].slice(0, groups.length);
  const x = { field: 'x', type: 'quantitative', title: `${cost} (mean per run)`, scale: { zero: false } };
  const y = { field: 'y', type: 'quantitative', title: `${quality} (case-adjusted mean)`, scale: { zero: false } };
  const color = {
    field: 'group',
    type: 'nominal',
    title: null,
    scale: { domain: groups, range },
    legend: { orient: 'bottom' },
  };

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    layer: [
      {
        data: { values: measured.filter(m => m.optimal) },
        mark: { type: 'line', strokeDash: [4, 3] },
        encoding: { x: { ...x, sort: 'ascending' }, y, color: { value: colors.optimal } },
      },
      {
        data: { values: measured },
        mark: { type: 'rule', opacity: 0.35 },
        encoding: { x, y: { field: 'yLow', type: 'quantitative' }, y2: { field: 'yHigh' }, color },
      },
      {
        data: { values: measured },
        mark: { type: 'point', filled: true, size: 75, opacity: 0.9 },
        encoding: {
          x,
          y,
          color,
          tooltip: [
            { field: 'name', title: 'configuration' },
            { field: 'config', title: 'params' },
            { field: 'y', title: quality, format: '.4~g' },
            { field: 'x', title: cost, format: '.4~g' },
            { field: 'runs', title: 'runs' },
            { field: 'group', title: 'status' },
          ],
        },
      },
      {
        data: { values: measured.filter(m => m.highlighted) },
        mark: { type: 'point', filled: false, size: 320, strokeWidth: 2 },
        encoding: { x, y, color: { value: colors.highlight } },
      },
      ...(predicted.length
        ? [
          {
            data: { values: predicted },
            mark: { type: 'rule', strokeDash: [2, 2] },
            encoding: { x, y: { field: 'yLow', type: 'quantitative' }, y2: { field: 'yHigh' }, color },
          },
          {
            data: { values: predicted },
            mark: { type: 'point', shape: 'diamond', filled: false, size: 120, strokeWidth: 2 },
            encoding: {
              x,
              y,
              color,
              tooltip: [
                { field: 'config', title: 'untested params' },
                { field: 'y', title: `predicted ${quality}`, format: '.4~g' },
                { field: 'yLow', title: 'interval low', format: '.4~g' },
                { field: 'yHigh', title: 'interval high', format: '.4~g' },
                { field: 'x', title: `predicted ${cost}`, format: '.4~g' },
              ],
            },
          },
        ]
        : []),
    ],
    config: { view: { stroke: null } },
  };
}
