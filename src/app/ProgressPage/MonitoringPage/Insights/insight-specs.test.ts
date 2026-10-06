// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import type { TopLevelSpec } from 'vega-lite';
import { parse, View } from 'vega';
import { compareParamValues, paretoFrontier } from '../../../../shared/utils/run-statistics';
import type { RunRecord } from '../../../../shared/utils/run-statistics';
import { comparisonSpec, tradeoffSpec } from './insight-specs';

const records: RunRecord[] = [1, 2, 3].flatMap(i => [
  { id: `a${i}`, name: `a${i}`, params: { variant: 'a' }, metrics: { quality: 0.8 + i / 100, latency_ms: 300 + i } },
  { id: `b${i}`, name: `b${i}`, params: { variant: 'b' }, metrics: { quality: 0.9 + i / 100, latency_ms: 900 + i } },
]);

/** Compile with the real Vega-Lite compiler and run the dataflow headlessly. */
const renderHeadless = async (spec: Record<string, unknown>) => {
  const view = new View(parse(compile(spec as unknown as TopLevelSpec).spec), { renderer: 'none' });

  await view.runAsync();

  return view;
};

describe('insight chart specs', () => {
  it('the CI comparison chart compiles and plots every param value', async () => {
    const groups = compareParamValues(records, 'variant', 'quality', 'maximize');
    const colors = { best: 'green', tie: 'blue', worse: 'red', insufficient: 'grey' };
    const view = await renderHeadless(comparisonSpec(groups, 'variant', 'quality', { verdicts: colors, interval: 'black' }));

    expect(view.data('source_0').map(d => d.value)).toEqual(['b', 'a']);
  });

  it('the trade-off chart compiles and keeps all runs', async () => {
    const points = paretoFrontier(records, 'latency_ms', 'minimize', 'quality', 'maximize');
    const view = await renderHeadless(tradeoffSpec(points, 'latency_ms', 'quality', { optimal: 'green', dominated: 'grey' }));

    expect(view.data('source_0')).toHaveLength(6);
  });
});
