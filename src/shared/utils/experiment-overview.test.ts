import { describe, expect, it } from 'vitest';
import {
  attentionItems,
  passedSafety,
  percentile,
  pickCostMetric,
  QUALITY_SCORE,
  qualitySource,
  variantMap,
  withQualityScore,
} from './experiment-overview';
import type { RunRecord } from './run-statistics';

const run = (id: string, variant: string, metrics: Record<string, number>, caseId = 'q1'): RunRecord => ({
  id,
  name: id,
  params: { variant, case_id: caseId },
  metrics,
});

describe('quality score', () => {
  it('averages the quality evals and ignores safety evals', () => {
    const [r] = withQualityScore([run('a', 'x', { eval_faithfulness: 1, eval_correctness: 0.5, eval_toxicity: 0 })]);

    expect(r.metrics[QUALITY_SCORE]).toBe(0.75);
  });

  it('falls back to a pass-style metric without evals', () => {
    const records = [run('a', 'x', { judge_passed: 1, latency_ms: 5 }), run('b', 'y', { judge_passed: 0, latency_ms: 9 })];

    expect(qualitySource(records).metrics).toEqual(['judge_passed']);
    expect(withQualityScore(records).map(r => r.metrics[QUALITY_SCORE])).toEqual([1, 0]);
  });
});

describe('helpers', () => {
  it('picks dollars, then latency, for cost', () => {
    expect(pickCostMetric([run('a', 'x', { cost_usd: 0, latency_ms: 10 })])).toBe('latency_ms');
    expect(pickCostMetric([run('a', 'x', { cost_usd: 0.1, latency_ms: 10 })])).toBe('cost_usd');
    expect(pickCostMetric([run('a', 'x', { eval_bias: 1 })])).toBeNull();
  });

  it('computes nearest-rank percentiles', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([5, 1, 3], 50)).toBe(3);
    expect(percentile([], 95)).toBeNull();
  });

  it('checks every safety eval against its pass mark', () => {
    expect(passedSafety(run('a', 'x', { eval_toxicity: 1, eval_pii_leakage: 1 }))).toBe(true);
    expect(passedSafety(run('a', 'x', { eval_toxicity: 1, eval_pii_leakage: 0 }))).toBe(false);
    expect(passedSafety(run('a', 'x', { eval_faithfulness: 1 }))).toBeNull();
  });
});

describe('variantMap', () => {
  it('flags only the variants nothing beats on both quality and cost', () => {
    const records = withQualityScore([
      run('a', 'cheap', { eval_correctness: 0.6, latency_ms: 100 }),
      run('b', 'good', { eval_correctness: 0.9, latency_ms: 300 }),
      run('c', 'bad', { eval_correctness: 0.5, latency_ms: 400 }),
    ]);
    const points = Object.fromEntries(variantMap(records, 'variant', 'latency_ms').map(p => [p.group, p.frontier]));

    expect(points).toEqual({ cheap: true, good: true, bad: false });
  });
});

describe('attentionItems', () => {
  const records = [
    ...[1, 1, 1].map((v, i) => run(`b${i}`, 'baseline', { eval_pii_leakage: v, eval_prompt_injection: i === 0 ? 0 : 1 }, i === 0 ? 'inject' : 'q1')),
    ...[0, 0, 0].map((v, i) => run(`f${i}`, 'footer', { eval_pii_leakage: v, eval_prompt_injection: i === 0 ? 0 : 1 }, i === 0 ? 'inject' : 'q1')),
  ];
  const outcomes = [
    ...records.map(r => ({ status: 'COMPLETED', params: r.params })),
    { status: 'FAILED', params: { variant: 'flaky' } },
    { status: 'COMPLETED', params: { variant: 'flaky' } },
  ];

  const items = attentionItems(outcomes, records, 'variant', 'baseline', ['eval_pii_leakage', 'eval_prompt_injection']);
  const titles = items.map(i => i.title);

  it('reports failed runs, safety regressions and cases failing everywhere', () => {
    expect(titles).toContain('flaky: 1 of 2 runs failed');
    expect(titles).toContain('footer: pii leakage regressed');
    expect(items.find(i => i.title.startsWith('footer'))?.detail).toBe('pii leakage 1 → 0');
    expect(titles).toContain('Case "inject" fails prompt injection');
    expect(items.find(i => i.title.startsWith('Case'))?.detail).toBe('in 2 of 2 runs, in every variant');
  });

  it('links each item to the traces that show it', () => {
    expect(items.find(i => i.title.startsWith('flaky'))?.traces).toEqual({ variants: ['flaky'], status: 'error' });
    expect(items.find(i => i.title.startsWith('footer'))?.traces).toEqual({ variants: ['footer'], status: 'failing', check: 'pii leakage' });
    expect(items.find(i => i.title.startsWith('Case'))?.traces).toEqual({ cases: ['inject'], check: 'prompt injection' });
  });

  it('lists high severity first', () => {
    expect(items.every((item, i) => i === 0 || item.severity !== 'high' || items[i - 1].severity === 'high')).toBe(true);
  });
});
