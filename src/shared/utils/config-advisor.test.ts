import { describe, expect, it } from 'vitest';
import {
  EVAL_AVERAGE,
  adviseMeasured,
  candidateConfigs,
  configKey,
  configKnobs,
  fitSurrogate,
  measureConfigs,
  predictUntested,
  solveLinear,
  withEvalAverage,
} from './config-advisor';
import type { Objectives } from './config-advisor';
import type { RunRecord } from './run-statistics';

const OBJECTIVES: Objectives = {
  quality: 'eval_correctness',
  qualityDirection: 'maximize',
  cost: 'total_tokens',
  costDirection: 'minimize',
};

const CASES = ['easy', 'medium', 'hard'];
const CASE_DIFFICULTY: Record<string, number> = { easy: 0.1, medium: 0, hard: -0.3 };

/**
 * A known world: quality rises with top_k up to 2 then flattens, the "concise" prompt
 * costs a little quality, tokens grow 100 per chunk and the "detailed" prompt adds 150.
 */
const truth = (topK: number, prompt: string) => ({
  quality: 0.5 + 0.3 * Math.min(topK, 2) / 2 - (prompt === 'concise' ? 0.05 : 0),
  tokens: 80 + 100 * topK + (prompt === 'detailed' ? 150 : prompt === 'concise' ? -30 : 0),
});

let seed = 1;
const noise = () => {
  seed = (seed * 16807) % 2147483647;

  return (seed / 2147483647 - 0.5) * 0.02;
};

const makeRuns = (configs: Array<[number, string]>): RunRecord[] =>
  configs.flatMap(([topK, prompt]) =>
    CASES.map(caseId => {
      const t = truth(topK, prompt);

      return {
        id: `k${topK}_${prompt}_${caseId}`,
        name: `k${topK}_${prompt}_${caseId}`,
        params: { variant: `k${topK}_${prompt}`, case_id: caseId, top_k: String(topK), prompt_style: prompt },
        metrics: {
          eval_correctness: t.quality + CASE_DIFFICULTY[caseId] + noise(),
          total_tokens: t.tokens + (caseId === 'hard' ? 40 : 0),
        },
      };
    }),
  );

const ALL: Array<[number, string]> = [1, 2, 3, 4].flatMap(k => ['grounded', 'concise', 'detailed'].map(p => [k, p] as [number, string]));
// Leave out k2_concise (the true cheapest near-best config) and k4_grounded.
const TESTED = ALL.filter(([k, p]) => !(k === 2 && p === 'concise') && !(k === 4 && p === 'grounded'));

describe('configKnobs', () => {
  it('drops the case param and the variant name when real knobs vary', () => {
    expect(configKnobs(makeRuns(TESTED), 'variant', 'case_id').sort()).toEqual(['prompt_style', 'top_k']);
  });

  it('counts a param that only some configurations set', () => {
    const runs = makeRuns(TESTED).map(r =>
      r.params.variant === 'k2_grounded' ? { ...r, params: { ...r.params, retriever_timeout_rate: '0.4' } } : r,
    );

    expect(configKnobs(runs, 'variant', 'case_id')).toContain('retriever_timeout_rate');
  });

  it('keeps the variant name when it is the only thing that varies', () => {
    const runs = makeRuns(TESTED).map(r => ({ ...r, params: { variant: r.params.variant, case_id: r.params.case_id } }));

    expect(configKnobs(runs, 'variant', 'case_id')).toEqual(['variant']);
  });
});

describe('measureConfigs', () => {
  const runs = makeRuns(TESTED);
  const knobs = configKnobs(runs, 'variant', 'case_id');
  const configs = measureConfigs(runs, knobs, OBJECTIVES, { caseParam: 'case_id', groupParam: 'variant' });

  it('groups runs into one configuration per knob combination', () => {
    expect(configs).toHaveLength(TESTED.length);
    expect(configs.every(c => c.runIds.length === CASES.length && c.cases === CASES.length)).toBe(true);
    expect(configs.find(c => c.values.top_k === '1' && c.values.prompt_style === 'grounded')?.name).toBe('k1_grounded');
  });

  it('removes case difficulty, so a config is not penalised for running the hard case', () => {
    const k3 = configs.find(c => c.key === configKey({ top_k: '3', prompt_style: 'grounded' }, knobs));

    // Raw values swing by 0.4 between the easy and hard case; adjusted ones only by the noise.
    expect(k3 && Math.max(...k3.qualityValues) - Math.min(...k3.qualityValues)).toBeLessThan(0.05);
  });

  it('marks the Pareto frontier of quality vs cost', () => {
    const frontier = configs.filter(c => c.optimal).map(c => c.name).sort();

    expect(frontier).toContain('k1_concise');
    expect(frontier).not.toContain('k4_detailed');
  });

  it('counts failed runs per configuration', () => {
    const withFailures = measureConfigs(runs, knobs, OBJECTIVES, {
      caseParam: 'case_id',
      failedRuns: [{ top_k: '1', prompt_style: 'grounded', case_id: 'easy' }],
    });

    expect(withFailures.find(c => c.values.top_k === '1' && c.values.prompt_style === 'grounded')?.failed).toBe(1);
  });
});

describe('adviseMeasured', () => {
  const runs = makeRuns(TESTED);
  const knobs = configKnobs(runs, 'variant', 'case_id');
  const configs = measureConfigs(runs, knobs, OBJECTIVES, { caseParam: 'case_id', groupParam: 'variant' });

  it('finds the cheapest configuration within the quality tolerance of the best', () => {
    const advice = adviseMeasured(configs, OBJECTIVES, 0.02);

    expect(advice?.best.config.values.top_k).not.toBe('1');
    expect(advice?.cheaper?.config.name).toBe('k2_grounded');
    expect(advice?.cheaper?.costSaving).toBeGreaterThan(0);
    expect(advice?.cheaper?.qualityDelta).toBeGreaterThan(-advice!.toleranceAbs);
  });

  it('suggests a cheaper move from the baseline with the params that change', () => {
    const baseline = configs.find(c => c.name === 'k4_detailed');
    const advice = adviseMeasured(configs, OBJECTIVES, 0.02, baseline?.key);

    expect(advice?.fromBaseline?.costSaving).toBeGreaterThan(0.4);
    expect(advice?.fromBaseline?.changes.map(c => c.param).sort()).toEqual(['prompt_style', 'top_k']);
  });

  it('never prefers a configuration that failed over one that did not', () => {
    const flaky = configs.map(c => (c.name === 'k2_grounded' ? { ...c, failed: 2 } : c));
    const advice = adviseMeasured(flaky, OBJECTIVES, 0.02);

    expect(advice?.cheaper?.config.name).not.toBe('k2_grounded');
    expect(advice?.best.config.name).not.toBe('k2_grounded');
  });
});

describe('surrogate', () => {
  const runs = makeRuns(TESTED);
  const knobs = configKnobs(runs, 'variant', 'case_id');
  const configs = measureConfigs(runs, knobs, OBJECTIVES, { caseParam: 'case_id', groupParam: 'variant' });

  it('solves a linear system', () => {
    expect(solveLinear([[2, 1], [1, 3]], [3, 5]).map(v => Number(v.toFixed(6)))).toEqual([0.8, 1.4]);
  });

  it('enumerates every combination of tried values', () => {
    expect(candidateConfigs({ a: ['1', '2'], b: ['x', 'y', 'z'] })).toHaveLength(6);
  });

  it('predicts the cost of an untested configuration from the ones that ran', () => {
    const fit = fitSurrogate(configs, knobs, c => c.cost.mean, 'total_tokens');
    const predicted = fit?.predict({ top_k: '2', prompt_style: 'concise' });
    const actual = truth(2, 'concise').tokens + 40 / 3;

    expect(fit?.r2).toBeGreaterThan(0.9);
    expect(Math.abs((predicted?.mean ?? 0) - actual)).toBeLessThan(25);
  });

  it('suggests the left-out cheaper configuration as worth running', () => {
    const advice = adviseMeasured(configs, OBJECTIVES, 0.15);
    const prediction = advice && predictUntested(configs, knobs, OBJECTIVES, advice);

    expect(prediction?.untested).toBe(2);
    expect(prediction?.reliable).toBe(true);
    expect(prediction?.suggestions.map(s => `${s.values.top_k}_${s.values.prompt_style}`)).toContain('2_concise');
  });

  it('never predicts beyond the values runs actually produced', () => {
    const fit = fitSurrogate(configs, knobs, c => c.quality.mean, 'eval_correctness', { bounds: [0, 0.7] });

    expect(fit?.predict({ top_k: '4', prompt_style: 'grounded' }).mean).toBeLessThanOrEqual(0.7);
  });

  it('does not call predictions reliable with too few configurations', () => {
    const few = configs.slice(0, 6);
    const advice = adviseMeasured(few, OBJECTIVES, 0.15);

    expect(advice && predictUntested(few, knobs, OBJECTIVES, advice)?.reliable).toBe(false);
  });

  it('keeps cost predictions positive on a log scale', () => {
    const fit = fitSurrogate(configs, knobs, c => c.cost.mean, 'total_tokens', { logScale: true });

    expect(fit?.logScale).toBe(true);
    expect(fit?.predict({ top_k: '1', prompt_style: 'concise' }).mean).toBeGreaterThan(0);
  });

  it('refuses to fit when nothing varies', () => {
    const flat = configs.map(c => ({ ...c, cost: { ...c.cost, mean: 100 } }));

    expect(fitSurrogate(flat, knobs, c => c.cost.mean, 'total_tokens')).toBeNull();
  });
});

describe('withEvalAverage', () => {
  it('averages the eval scores of each run', () => {
    const [r] = withEvalAverage([{ id: 'a', name: 'a', params: {}, metrics: { eval_a: 1, eval_b: 0.5, latency_ms: 9 } }]);

    expect(r.metrics[EVAL_AVERAGE]).toBe(0.75);
  });
});
