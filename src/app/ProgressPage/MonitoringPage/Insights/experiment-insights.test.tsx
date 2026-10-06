import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { store } from '../../../../store/store';
import { setWorkflowsData } from '../../../../store/slices/progressPageSlice';
import ThemeWrapper from '../../../../ThemeWrapper';
import type { IRun } from '../../../../shared/models/experiment/run.model';
import ExperimentInsights from './experiment-insights';

// jsdom has no canvas for Vega; the chart cards are covered by their specs, not pixels.
vi.mock('../../../../shared/components/responsive-card-vegalite', () => ({
  default: ({ title }: { title: string }) => <div data-testid="vega-card">{title}</div>,
}));

const run = (id: string, params: Record<string, string>, metrics: Record<string, number>): IRun => ({
  id,
  name: id,
  experimentId: 'exp',
  status: 'COMPLETED',
  params: Object.entries(params).map(([name, value]) => ({ name, value })),
  metrics: Object.entries(metrics).map(([name, value]) => ({ name, value, timestamp: 1, step: 0 })),
  dataAssets: [],
  tags: {},
});

const PROMPTS = { concise: 'Answer in one short sentence.', detailed: 'Answer thoroughly, with your reasoning.' };

/** Shaped like a prompt A/B test: 2 variants × 2 questions × 3 repeats; the judge always passes. */
const promptAbTest = (['concise', 'detailed'] as const).flatMap(variant =>
  ['capital-fr', 'capital-jp'].flatMap(caseId =>
    [0, 1, 2].map(repeat =>
      run(
        `${variant}__${caseId}__${repeat}`,
        { variant, system_prompt: PROMPTS[variant], case_id: caseId },
        {
          judge_passed: 1,
          latency_ms: (variant === 'concise' ? 400 : 5000) + repeat * 50,
          total_tokens: (variant === 'concise' ? 52 : 200) + repeat,
        },
      ),
    ),
  ),
);

const renderInsights = (runs: IRun[]) => {
  store.dispatch(setWorkflowsData(runs));

  return render(
    <Provider store={store}>
      <ThemeWrapper>
        <MemoryRouter initialEntries={['/exp/monitoring']}>
          <Routes>
            <Route path="/:experimentId/monitoring" element={<ExperimentInsights />} />
          </Routes>
        </MemoryRouter>
      </ThemeWrapper>
    </Provider>,
  );
};

describe('ExperimentInsights', () => {
  beforeEach(() => {
    store.dispatch(setWorkflowsData([]));
  });

  it('finds what drives an LLM experiment and which variant wins', () => {
    renderInsights(promptAbTest);

    // The judge never varies, so the tab focuses on the first metric that does.
    expect(screen.getByText('What drives latency_ms?')).toBeInTheDocument();

    const impactTable = screen.getByRole('table', { name: 'Params ranked by their effect on latency_ms' });

    expect(within(impactTable).getByText('changes together with system_prompt')).toBeInTheDocument();
    expect(within(impactTable).getByText('Significant')).toBeInTheDocument();

    const comparison = screen.getByRole('table', { name: 'latency_ms by variant' });

    expect(within(comparison).getByText('Best')).toBeInTheDocument();
    expect(within(comparison).getByText('Significantly worse')).toBeInTheDocument();
    expect(screen.getByText('Trade-off: latency_ms vs total_tokens')).toBeInTheDocument();
  });

  it('says plainly when no param changed the metric', () => {
    const flatGrid = ['3', '5', '10'].flatMap(depth =>
      ['50', '100'].map(n => run(`rf_${depth}_${n}`, { max_depth: depth, n_estimators: n }, { accuracy: 0.9649, f1: 0.9722 })),
    );

    renderInsights(flatGrid);

    expect(screen.getByText(/Every run scored exactly/)).toBeInTheDocument();
    expect(screen.queryByText('Significantly worse')).not.toBeInTheDocument();
  });

  it('explains what is missing when there is too little data', () => {
    renderInsights([run('only', { a: '1' }, { m: 1 })]);

    expect(screen.getByText('Insights need at least two completed runs that logged the same metric.')).toBeInTheDocument();
  });
});
