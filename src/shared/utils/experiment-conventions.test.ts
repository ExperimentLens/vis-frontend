import { afterEach, describe, expect, it } from 'vitest';
import { caseParam, costMetrics, groupParam, preferredBaseline, setExperimentConventions } from './experiment-conventions';
import { evalPassMark, isSafetyEval } from './eval-quality';
import { inferDirection } from './run-statistics';

describe('experiment conventions', () => {
  afterEach(() => setExperimentConventions('', {}));

  it('falls back to the old conventions without tags', () => {
    setExperimentConventions('1', {});
    expect(groupParam()).toBe('variant');
    expect(caseParam()).toBe('case_id');
    expect(evalPassMark('eval_toxicity')).toBe(0.75);
    expect(evalPassMark('eval_faithfulness')).toBe(0.5);
    expect(inferDirection('wait_time')).toBe('minimize');
    expect(costMetrics(() => true)).toEqual(['latency_ms', 'cost_usd', 'total_tokens']);
    expect(preferredBaseline(['a', 'baseline'])).toBe('baseline');
  });

  it('uses what the SDK declared', () => {
    setExperimentConventions('2', {
      'experimentlens.metric.eval_faithfulness': '{"pass": 0.8, "direction": "maximize", "kind": "quality"}',
      'experimentlens.metric.eval_tone': '{"pass": 0.9, "kind": "safety"}',
      'experimentlens.metric.hallucinations': '{"direction": "minimize", "kind": "quality"}',
      'experimentlens.metric.wait_time': '{"direction": "minimize", "kind": "cost"}',
      'experimentlens.metric.broken': 'not json',
      'experimentlens.group_param': 'prompt',
      'experimentlens.case_param': 'item',
      'experimentlens.baseline': 'v1',
    });
    expect(evalPassMark('eval_faithfulness')).toBe(0.8);
    expect(isSafetyEval('eval_tone')).toBe(true);
    expect(inferDirection('hallucinations')).toBe('minimize');
    expect(costMetrics(m => m !== 'nope')).toEqual(['wait_time']);
    expect(groupParam()).toBe('prompt');
    expect(caseParam()).toBe('item');
    expect(preferredBaseline(['v0', 'v1', 'baseline'])).toBe('v1');
    expect(preferredBaseline(['v0'])).toBe('v0');
  });
});
