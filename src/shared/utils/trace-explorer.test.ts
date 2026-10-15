import { describe, expect, it } from 'vitest';
import type { TraceDetail } from '../models/observability/trace-detail';
import type { Observation } from '../models/observability/observation';
import { caseGrid, checkDiff, counterparts, defaultBaseline, EMPTY_FILTERS, filterOptions, filterTraceRows, filtersFromQuery, filtersToQuery, toTraceRows } from './trace-explorer';

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
