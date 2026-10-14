import { describe, expect, it } from 'vitest';
import {
  compareToBaseline,
  evalMetrics,
  groupingParams,
  scoresByGroup,
  scoresOverTime,
  scoreTone,
} from './eval-quality';
import { inferDirection } from './run-statistics';
import type { RunRecord } from './run-statistics';

const run = (id: string, variant: string, metrics: Record<string, number>, caseId = 'q1'): RunRecord => ({
  id,
  name: id,
  params: { variant, case_id: caseId, top_k: variant === 'top1' ? '1' : '2' },
  metrics,
});

describe('eval metrics', () => {
  it('are higher-is-better even when named after something bad', () => {
    expect(inferDirection('eval_toxicity')).toBe('maximize');
    expect(inferDirection('toxicity')).toBe('minimize');
  });

  it('list quality metrics before safety metrics', () => {
    const records = [run('a', 'x', { eval_toxicity: 1, eval_faithfulness: 1, latency_ms: 5, eval_answer_relevance: 1 })];

    expect(evalMetrics(records)).toEqual(['eval_answer_relevance', 'eval_faithfulness', 'eval_toxicity']);
  });

  it('use the SDK pass marks for tone', () => {
    expect(scoreTone('eval_faithfulness', 0.5)).toBe('good');
    expect(scoreTone('eval_toxicity', 0.5)).toBe('warn');
    expect(scoreTone('eval_pii_leakage', 0)).toBe('bad');
  });
});

describe('grouping', () => {
  it('prefers variant, drops case ids and params that alias it', () => {
    const records = [run('a', 'top1', {}, 'q1'), run('b', 'top2', {}, 'q2')];

    expect(groupingParams(records)).toEqual(['variant']);
  });

  it('averages scores per group, best first', () => {
    const records = [
      run('a', 'top1', { eval_faithfulness: 1 }),
      run('b', 'top1', { eval_faithfulness: 0.5 }),
      run('c', 'top2', { eval_faithfulness: 1 }),
    ];
    const rows = scoresByGroup(records, 'variant', ['eval_faithfulness']);

    expect(rows.map(r => [r.group, r.runs, r.scores.eval_faithfulness.mean])).toEqual([
      ['top2', 1, 1],
      ['top1', 2, 0.75],
    ]);
  });
});

describe('compareToBaseline', () => {
  const records = [
    ...[0.9, 0.95, 0.9, 1].map((v, i) => run(`b${i}`, 'base', { eval_faithfulness: v, latency_ms: 100 + i })),
    ...[0.5, 0.55, 0.5, 0.6].map((v, i) => run(`n${i}`, 'new', { eval_faithfulness: v, latency_ms: 300 + i })),
  ];

  it('flags a significant drop and a significant slowdown as regressions', () => {
    const [faith, latency] = compareToBaseline(records, 'variant', 'base', 'new', ['eval_faithfulness', 'latency_ms']);

    expect(faith.verdict).toBe('regressed');
    expect(faith.delta).toBeCloseTo(-0.4);
    expect(latency.verdict).toBe('regressed');
  });

  it('calls the reverse direction an improvement', () => {
    const [faith] = compareToBaseline(records, 'variant', 'new', 'base', ['eval_faithfulness']);

    expect(faith.verdict).toBe('improved');
  });

  it('treats overlapping noisy groups as noise', () => {
    const noisy = [
      ...[0.2, 0.9, 0.4, 0.8].map((v, i) => run(`b${i}`, 'base', { s: v })),
      ...[0.1, 0.9, 0.3, 0.8].map((v, i) => run(`n${i}`, 'new', { s: v })),
    ];

    expect(compareToBaseline(noisy, 'variant', 'base', 'new', ['s'])[0].verdict).toBe('noise');
  });

  it('falls back to the tolerance with single runs, and reports missing data', () => {
    const single = [run('a', 'base', { s: 0.8 }), run('b', 'new', { s: 0.78 })];

    expect(compareToBaseline(single, 'variant', 'base', 'new', ['s'])[0].verdict).toBe('regressed');
    expect(compareToBaseline(single, 'variant', 'base', 'new', ['s'], 0.05)[0].verdict).toBe('unchanged');
    expect(compareToBaseline(single, 'variant', 'base', 'new', ['missing'])[0].verdict).toBe('no-data');
  });
});

describe('scoresOverTime', () => {
  it('returns one point per timed run, oldest first', () => {
    const records = [run('a', 'top1', { eval_bias: 1 }), run('b', 'top2', { eval_bias: 0.5 }), run('c', 'top2', {})];
    const points = scoresOverTime(records, { a: 200, b: 100, c: 50 }, 'variant', 'eval_bias');

    expect(points.map(p => [p.runId, p.group, p.value])).toEqual([
      ['b', 'top2', 0.5],
      ['a', 'top1', 1],
    ]);
  });
});
