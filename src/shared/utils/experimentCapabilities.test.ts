import { describe, expect, it } from 'vitest';
import type { IRun } from '../models/experiment/run.model';
import type { IDataAsset } from '../models/experiment/data-asset.model';
import { deriveCapabilities, hasModelExplainability } from './experimentCapabilities';

const asset = (name: string, folder?: string) => ({ name, folder }) as IDataAsset;

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

describe('hasModelExplainability', () => {
  it('detects MLflow runs by their model or explainability folder', () => {
    expect(hasModelExplainability(null, [asset('model.pkl')])).toBe(true);
    expect(hasModelExplainability(null, [asset('model.pt')])).toBe(true);
    expect(hasModelExplainability(null, [asset('X_test.csv', 'explainability')])).toBe(true);
  });

  it('detects ExtremeXP runs by an explainability task', () => {
    expect(hasModelExplainability([{ name: 'ModelExplainability' } as never], [])).toBe(true);
  });

  it('ignores plain logging runs', () => {
    expect(hasModelExplainability(null, [asset('plot.png', 'outputs')])).toBe(false);
    expect(hasModelExplainability(undefined, undefined)).toBe(false);
  });
});

describe('deriveCapabilities', () => {
  it('an ML experiment with a model gets explainability and datasets, not traces', () => {
    const caps = deriveCapabilities({ tags: { experiment_type: 'ml' } } as never, [
      run({ dataAssets: [asset('model.pkl', 'explainability')] }),
    ]);

    expect(caps).toEqual({ traces: false, explainability: true, datasets: true });
  });

  it('an LLM experiment gets traces from its tag or from langfuse run tags', () => {
    expect(deriveCapabilities({ tags: { experiment_type: 'llm' } } as never, []).traces).toBe(true);
    expect(deriveCapabilities(null, [run({ tags: { 'langfuse.session_id': 's' } })]).traces).toBe(true);
  });

  it('reports nothing for an empty experiment', () => {
    expect(deriveCapabilities(null, [])).toEqual({ traces: false, explainability: false, datasets: false });
  });
});
