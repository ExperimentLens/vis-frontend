import { describe, expect, it } from 'vitest';
import type { IRun } from '../models/experiment/run.model';
import {
  NOT_SET,
  cohensD,
  collapseAliasedParams,
  compareParamValues,
  comparableMetrics,
  fTestPValue,
  formatPValue,
  holmAdjust,
  inferDirection,
  paretoFrontier,
  rankParamImpact,
  summarize,
  tCritical95,
  tTestPValue,
  toRunRecords,
  varyingParams,
  welchTTest,
} from './run-statistics';
import type { RunRecord } from './run-statistics';

const record = (id: string, params: Record<string, string>, metrics: Record<string, number>): RunRecord => ({
  id,
  name: id,
  params,
  metrics,
});

describe('distributions (reference values from statistical tables)', () => {
  it('t-test p-values', () => {
    expect(tTestPValue(2.228139, 10)).toBeCloseTo(0.05, 4);
    expect(tTestPValue(2, 8)).toBeCloseTo(0.080516, 5);
    expect(tTestPValue(0, 5)).toBeCloseTo(1, 10);
  });

  it('critical t values for 95% intervals', () => {
    expect(tCritical95(1)).toBeCloseTo(12.7062, 3);
    expect(tCritical95(4)).toBeCloseTo(2.7764, 3);
    expect(tCritical95(10)).toBeCloseTo(2.2281, 3);
    expect(tCritical95(1e6)).toBeCloseTo(1.96, 2);
  });

  it('F-test p-values', () => {
    expect(fTestPValue(4.2565, 2, 9)).toBeCloseTo(0.05, 3);
    expect(fTestPValue(1, 1, 1)).toBeCloseTo(0.5, 6);
    expect(fTestPValue(0, 3, 10)).toBe(1);
  });
});

describe('summaries and tests', () => {
  it('mean with a t-based 95% confidence interval', () => {
    const s = summarize([1, 2, 3, 4, 5]);

    expect(s.mean).toBe(3);
    expect(s.std).toBeCloseTo(1.5811, 4);
    expect(s.ciLow).toBeCloseTo(1.0368, 3);
    expect(s.ciHigh).toBeCloseTo(4.9632, 3);
  });

  it('a single run has no interval', () => {
    const s = summarize([7]);

    expect([s.ciLow, s.mean, s.ciHigh]).toEqual([7, 7, 7]);
  });

  it("Welch's t-test and Cohen's d", () => {
    const result = welchTTest([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);

    expect(result?.t).toBeCloseTo(-2, 10);
    expect(result?.df).toBeCloseTo(8, 10);
    expect(result?.p).toBeCloseTo(0.080516, 5);
    expect(cohensD([1, 2, 3, 4, 5], [3, 4, 5, 6, 7])).toBeCloseTo(-1.2649, 4);
  });

  it('needs two values per group', () => {
    expect(welchTTest([1], [2, 3])).toBeNull();
    expect(cohensD([1], [2, 3])).toBeNull();
  });

  it('treats noise-free groups as exact', () => {
    expect(welchTTest([1, 1], [1, 1])?.p).toBe(1);
    expect(welchTTest([1, 1], [2, 2])?.p).toBe(0);
  });

  it('Holm adjustment', () => {
    expect(holmAdjust([0.01, 0.04, 0.03])).toEqual([0.03, 0.06, 0.06]);
    expect(holmAdjust([])).toEqual([]);
  });
});

describe('experiment analyses', () => {
  const noisyAb = [
    record('a1', { variant: 'a', seed: '1' }, { score: 1.0, latency_ms: 100 }),
    record('a2', { variant: 'a', seed: '2' }, { score: 1.1, latency_ms: 120 }),
    record('a3', { variant: 'a', seed: '3' }, { score: 0.9, latency_ms: 110 }),
    record('b1', { variant: 'b', seed: '1' }, { score: 5.0, latency_ms: 400 }),
    record('b2', { variant: 'b', seed: '2' }, { score: 5.1, latency_ms: 420 }),
    record('b3', { variant: 'b', seed: '3' }, { score: 4.9, latency_ms: 410 }),
  ];

  it('finds the params and metrics worth analysing', () => {
    expect(varyingParams(noisyAb)).toEqual(['variant', 'seed']);
    expect(comparableMetrics(noisyAb)).toEqual(['latency_ms', 'score']);
  });

  it('ranks the param that explains the metric first', () => {
    const [top, second] = rankParamImpact(noisyAb, ['seed', 'variant'], 'score');

    expect(top.param).toBe('variant');
    expect(top.etaSquared).toBeGreaterThan(0.99);
    expect(top.p).toBeLessThan(0.001);
    expect(second.param).toBe('seed');
    expect(second.p).toBeGreaterThan(0.5);
  });

  it('reports no effect when every run scored the same', () => {
    const flat = noisyAb.map(r => ({ ...r, metrics: { score: 0.9649 } }));
    const [impact] = rankParamImpact(flat, ['variant'], 'score');

    expect(impact.etaSquared).toBe(0);
    expect(impact.p).toBe(1);
  });

  it('does not mistake float rounding for an effect', () => {
    // Nine identical values whose naive mean is one ulp off (real recall values from a grid search).
    const recall = 0.9859154929577465;
    const grid = ['3', '5', '10'].flatMap(depth =>
      ['50', '100', '200'].map(n => record(`${depth}-${n}`, { depth, n }, { recall })),
    );
    const impacts = rankParamImpact(grid, ['depth', 'n'], 'recall');

    expect(impacts.map(i => [i.etaSquared, i.p])).toEqual([[0, 1], [0, 1]]);
    expect(compareParamValues(grid, 'depth', 'recall', 'maximize').map(g => [g.value, g.verdict])).toEqual([
      ['3', 'tie'],
      ['5', 'tie'],
      ['10', 'tie'],
    ]);
  });

  it('collapses params that always change together', () => {
    const runs = [
      record('1', { variant: 'concise', system_prompt: 'Answer in one short sentence.', case: 'fr' }, {}),
      record('2', { variant: 'concise', system_prompt: 'Answer in one short sentence.', case: 'jp' }, {}),
      record('3', { variant: 'detailed', system_prompt: 'Answer thoroughly, with your reasoning.', case: 'fr' }, {}),
    ];

    expect(collapseAliasedParams(runs, ['case', 'system_prompt', 'variant'])).toEqual({
      params: ['case', 'variant'],
      aliases: { variant: ['system_prompt'] },
    });
  });

  it('keeps the named param when names and numbers change together', () => {
    const runs = ['rag_dense_context', 'rag_dense_precise', 'rag_mmr_multihop'].map((rag, i) =>
      record(rag, { chunk_overlap: ['100', '48', '72'][i], rag_name: rag, fetch_k: i === 2 ? '20' : '-', search_type: i === 2 ? 'mmr' : 'similarity' }, {}),
    );

    expect(collapseAliasedParams(runs, ['chunk_overlap', 'rag_name', 'fetch_k', 'search_type'])).toEqual({
      params: ['rag_name', 'search_type'],
      aliases: { rag_name: ['chunk_overlap'], search_type: ['fetch_k'] },
    });
  });

  it('refuses a p-value when no configuration was repeated', () => {
    const once = [
      record('x', { depth: '3' }, { f1: 0.9 }),
      record('y', { depth: '5' }, { f1: 0.8 }),
      record('z', { depth: '10' }, { f1: 0.7 }),
    ];
    const [impact] = rankParamImpact(once, ['depth'], 'f1');

    expect(impact.replicated).toBe(false);
    expect(impact.p).toBeNull();
  });

  it('compares param values against the best, respecting the direction', () => {
    const byLatency = compareParamValues(noisyAb, 'variant', 'latency_ms', 'minimize');

    expect(byLatency.map(g => g.value)).toEqual(['a', 'b']);
    expect(byLatency[0].verdict).toBe('best');
    expect(byLatency[1].verdict).toBe('worse');
    expect(byLatency[1].deltaVsBest).toBeCloseTo(-300, 6);

    const byScore = compareParamValues(noisyAb, 'variant', 'score', 'maximize');

    expect(byScore[0].value).toBe('b');
  });

  it('calls close values a tie and single runs insufficient', () => {
    const close = [
      record('a1', { v: 'a' }, { m: 1 }),
      record('a2', { v: 'a' }, { m: 3 }),
      record('b1', { v: 'b' }, { m: 1.1 }),
      record('b2', { v: 'b' }, { m: 2.9 }),
      record('c1', { v: 'c' }, { m: 0 }),
      record('n1', {}, { m: 0.5 }),
    ];
    const groups = compareParamValues(close, 'v', 'm', 'maximize');
    const verdicts = Object.fromEntries(groups.map(g => [g.value, g.verdict]));

    expect(verdicts).toEqual({ a: 'best', b: 'tie', c: 'insufficient', [NOT_SET]: 'insufficient' });
  });

  it('marks the Pareto frontier', () => {
    const points = paretoFrontier(
      [
        record('slow-good', {}, { quality: 0.9, latency_ms: 900 }),
        record('fast-ok', {}, { quality: 0.7, latency_ms: 100 }),
        record('dominated', {}, { quality: 0.6, latency_ms: 500 }),
        record('missing', {}, { quality: 1 }),
      ],
      'latency_ms',
      'minimize',
      'quality',
      'maximize',
    );

    expect(Object.fromEntries(points.map(p => [p.id, p.optimal]))).toEqual({
      'slow-good': true,
      'fast-ok': true,
      dominated: false,
    });
  });

  it('guesses the metric direction from its name', () => {
    expect(inferDirection('latency_ms')).toBe('minimize');
    expect(inferDirection('total_tokens')).toBe('minimize');
    expect(inferDirection('cost_usd')).toBe('minimize');
    expect(inferDirection('val_loss')).toBe('minimize');
    expect(inferDirection('accuracy')).toBe('maximize');
    expect(inferDirection('judge_passed')).toBe('maximize');
    expect(inferDirection('f1')).toBe('maximize');
    // Quality words win over cost-like words in the same name...
    expect(inferDirection('avg_token_f1_like')).toBe('maximize');
    expect(inferDirection('avg_latency_check_passed')).toBe('maximize');
    // ...but not over unmistakably bad ones.
    expect(inferDirection('hallucination_score')).toBe('minimize');
  });
});

describe('toRunRecords', () => {
  const run = (overrides: Partial<IRun>): IRun => ({
    id: 'r',
    experimentId: 'e',
    status: 'COMPLETED',
    params: [],
    metrics: [],
    dataAssets: [],
    tags: {},
    ...overrides,
  });

  it('keeps completed runs and takes each metric at its last step', () => {
    const records = toRunRecords([
      run({
        id: 'done',
        name: 'rf_1',
        params: [{ name: 'depth', value: '3' }],
        metrics: [
          { name: 'loss', value: 0.9, timestamp: 3, step: 0 },
          { name: 'loss', value: 0.2, timestamp: 1, step: 5 },
          { name: 'acc', value: 0.8, timestamp: 1 },
          { name: 'acc', value: 0.85, timestamp: 2 },
        ],
      }),
      run({ id: 'failed', status: 'FAILED' }),
      run({ id: 'running', status: 'RUNNING' }),
    ]);

    expect(records).toEqual([
      { id: 'done', name: 'rf_1', params: { depth: '3' }, metrics: { loss: 0.2, acc: 0.85 } },
    ]);
  });
});

describe('formatPValue', () => {
  it('formats p-values for display', () => {
    expect(formatPValue(null)).toBe('—');
    expect(formatPValue(0.0004)).toBe('< 0.001');
    expect(formatPValue(0.04567)).toBe('0.046');
  });
});
