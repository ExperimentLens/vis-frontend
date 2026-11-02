import { describe, expect, it } from 'vitest';
import type { TraceDetail } from '../models/observability/trace-detail';
import type { Observation } from '../models/observability/observation';
import { caseGrid, caseRecords, checkDiff, counterparts, defaultBaseline, EMPTY_FILTERS, filterOptions, filterTraceRows, filtersFromQuery, filtersToQuery, toTraceRows } from './trace-explorer';
import { compareToBaseline } from './eval-quality';
import type { Score } from '../models/observability/score';
import type { RunRecord } from './run-statistics';

const obs = (name: string, output: Record<string, unknown> = {}, level = 'DEFAULT'): Observation =>
  ({ id: name, traceId: 't', type: 'GENERATION', name, startTime: '', endTime: '', model: '', input: {}, output, level, statusMessage: '', parentObservationId: '', version: 1 });

const trace = (id: string, sessionId: string, question: string, answer: string, observations: Observation[]): TraceDetail =>
  ({ id, sessionId, timestamp: '2026-10-14T10:00:00Z', name: 'run', userId: 'e', release: '', version: '', metadata: {}, tags: [], isPublic: false,
    observations, scores: [], input: { question }, output: { answer }, latency: 1.5, totalCost: 0 });

const runs = [
  { id: 's1', name: 'base__fr', params: [{ name: 'variant', value: 'baseline' }, { name: 'case_id', value: 'fr' }] },
  { id: 's2', name: 'footer__fr', params: [{ name: 'variant', value: 'contact_footer' }, { name: 'case_id', value: 'fr' }] },
];

const rows = toTraceRows([
  trace('a', 's1', 'Capital of France?', 'Paris.', [obs('judge_faithfulness', { passed: true })]),
  {
    // pii_leakage is rule-based: logged as a boolean score, not a judge step. judge_faithfulness
    // also has its score (a duplicate) and the human annotation is not a check.
    ...trace('b', 's2', 'Capital of France?', 'Paris. Email help@x.com', [obs('judge_faithfulness', { passed: true })]),
    scores: [
      { id: '1', traceId: 'b', name: 'judge_faithfulness', value: 1, dataType: 'BOOLEAN', observationId: '', timestamp: '', comment: '' },
      { id: '2', traceId: 'b', name: 'pii_leakage', value: 0, dataType: 'BOOLEAN', observationId: '', timestamp: '', comment: 'email found' },
      { id: '3', traceId: 'b', name: 'human_helpful', value: 0, dataType: 'BOOLEAN', observationId: '', timestamp: '', comment: '' },
    ],
  },
  trace('c', 'unknown', 'Ping?', 'Pong', [obs('generate', {}, 'ERROR')]),
], runs);

describe('toTraceRows', () => {
  it('joins traces to their run params and derives status', () => {
    expect(rows.map(r => [r.id, r.variant, r.caseId, r.status, r.failedChecks])).toEqual([
      ['a', 'baseline', 'fr', 'pass', []],
      ['b', 'contact_footer', 'fr', 'fail', ['pii leakage']],
      ['c', 'unknown', '—', 'error', []],
    ]);
    expect(rows[1].latencyMs).toBe(1500);
    expect(rows[1].answer).toContain('help@x.com');
    expect(rows[1].judges).toEqual([
      { name: 'faithfulness', passed: true, rationale: undefined },
      { name: 'pii leakage', passed: false, rationale: 'email found' },
    ]);
  });
});

describe('filterTraceRows', () => {
  it('filters by search, variant, status and failed check', () => {
    expect(filterTraceRows(rows, { ...EMPTY_FILTERS, search: 'email' }).map(r => r.id)).toEqual(['b']);
    expect(filterTraceRows(rows, { ...EMPTY_FILTERS, variants: ['baseline'] }).map(r => r.id)).toEqual(['a']);
    expect(filterTraceRows(rows, { ...EMPTY_FILTERS, status: 'failing' }).map(r => r.id)).toEqual(['b', 'c']);
    expect(filterTraceRows(rows, { ...EMPTY_FILTERS, check: 'pii leakage' }).map(r => r.id)).toEqual(['b']);
    expect(filterTraceRows(rows, { ...EMPTY_FILTERS, minLatencyMs: 2000 })).toEqual([]);
  });

  it('offers distinct options for the menus', () => {
    expect(filterOptions(rows)).toEqual({ variants: ['baseline', 'contact_footer', 'unknown'], cases: ['fr'], checks: ['faithfulness', 'pii leakage'] });
  });
});

describe('filtersFromQuery', () => {
  it('reads deep-link params and ignores invalid ones', () => {
    const f = filtersFromQuery(new URLSearchParams('variant=contact_footer,baseline&check=pii%20leakage&status=failing&minLatencyMs=abc'));

    expect(f).toEqual({ ...EMPTY_FILTERS, variants: ['contact_footer', 'baseline'], check: 'pii leakage', status: 'failing' });
  });
});

describe('filtersToQuery', () => {
  it('round-trips through filtersFromQuery', () => {
    const f = { ...EMPTY_FILTERS, variants: ['a', 'b'], cases: ['fr'], status: 'failing' as const, check: 'pii leakage', search: 'email' };

    expect(filtersFromQuery(filtersToQuery(f))).toEqual(f);
    expect(filtersToQuery(EMPTY_FILTERS).toString()).toBe('');
  });
});

describe('caseGrid', () => {
  it('pools checks per case and variant, baseline column first', () => {
    const grid = caseGrid(rows);

    expect(grid.variants).toEqual(['baseline', 'contact_footer', 'unknown']);
    expect(grid.cases.map(c => c.caseId)).toEqual(['fr', '—']);
    expect(grid.cell('fr', 'contact_footer')).toMatchObject({ passedChecks: 1, totalChecks: 2, failing: 1 });
    expect(grid.cell('fr', 'unknown')).toBeUndefined();
  });
});

describe('baseline comparison', () => {
  it('finds the same case under another variant and lists flipped checks first', () => {
    const footer = rows[1];
    const [base] = counterparts(rows, footer, 'baseline');

    expect(base.id).toBe('a');
    expect(checkDiff(footer, base)).toEqual([
      { name: 'pii leakage', baseline: null, current: false },
      { name: 'faithfulness', baseline: true, current: true },
    ]);
    expect(defaultBaseline(['a', 'b'])).toBe('a');
  });
});

describe('dataset runs (one run per configuration, one trace per case)', () => {
  const metric = (traceId: string, name: string, value: number, dataType = 'NUMERIC'): Score =>
    ({ id: `${traceId}-${name}`, traceId, name, value, dataType, observationId: '', timestamp: '', comment: '' });
  const caseTrace = (id: string, sessionId: string, caseId: string, scores: Score[]): TraceDetail =>
    ({ ...trace(id, sessionId, 'Q?', 'A.', []), metadata: { case_id: caseId }, scores });
  const datasetRuns = [
    { id: 'base', name: 'base', status: 'COMPLETED', params: [{ name: 'variant', value: 'base' }, { name: 'top_k', value: '1' }] },
    { id: 'cand', name: 'cand', status: 'COMPLETED', params: [{ name: 'variant', value: 'cand' }, { name: 'top_k', value: '3' }] },
    { id: 'live', name: 'live', status: 'RUNNING', params: [{ name: 'variant', value: 'live' }] },
  ];
  const BASE = [0.8, 0.6, 0.9, 0.7];
  const CAND = [0.7, 0.6, 0.85, 0.65];
  const details = [
    ...BASE.map((v, i) => caseTrace(`b${i}`, 'base', `q${i}`, [metric(`b${i}`, 'eval_correctness', v), metric(`b${i}`, 'latency_ms', 100)])),
    ...CAND.map((v, i) => caseTrace(`c${i}`, 'cand', `q${i}`, [metric(`c${i}`, 'eval_correctness', v)])),
    // A failed case has no metric scores; checks and human annotations are not metrics.
    caseTrace('failed', 'cand', 'q9', [metric('failed', 'correctness', 0, 'BOOLEAN'), metric('failed', 'human_rating', 2)]),
    caseTrace('unfinished', 'live', 'q0', [metric('unfinished', 'eval_correctness', 1)]),
  ];

  it('makes one record per case trace of a completed run, with the run params and the case', () => {
    const records = caseRecords(details, datasetRuns);

    expect(records.map(r => r.id)).toEqual(['b0', 'b1', 'b2', 'b3', 'c0', 'c1', 'c2', 'c3']);
    expect(records[0]).toEqual({
      id: 'b0',
      runId: 'base',
      name: 'base · q0',
      params: { variant: 'base', top_k: '1', case_id: 'q0' },
      metrics: { eval_correctness: 0.8, latency_ms: 100 },
    });
  });

  it('reads the case of a trace from its metadata', () => {
    expect(toTraceRows(details.slice(0, 1), datasetRuns)[0].caseId).toBe('q0');
  });

  it('compares configurations over their cases, not over one mean per run', () => {
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    const runMeans: RunRecord[] = [
      { id: 'base', name: 'base', params: { variant: 'base' }, metrics: { eval_correctness: mean(BASE) } },
      { id: 'cand', name: 'cand', params: { variant: 'cand' }, metrics: { eval_correctness: mean(CAND) } },
    ];
    const verdict = (records: RunRecord[]) =>
      compareToBaseline(records, 'variant', 'base', 'cand', ['eval_correctness'])[0].verdict;

    // One value per configuration leaves no way to tell a 0.05 drop from noise...
    expect(verdict(runMeans)).toBe('regressed');
    // ...four cases each show it is within the cases' spread.
    expect(verdict(caseRecords(details, datasetRuns))).toBe('noise');
  });
});
