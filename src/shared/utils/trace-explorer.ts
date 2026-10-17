import type { TraceDetail } from '../models/observability/trace-detail';
import type { GenOutput } from '../models/observability/agentic-conventions';
import { isErrorLevel, isJudge, prettyName } from '../models/observability/agentic-conventions';
import { isHumanScoreName } from '../../app/Tasks/Observability/score-dimensions';
import { sumTraceTokens, traceAnswer, traceDurationMs, traceQuestion } from './observability-aggregates';
import { caseParam, groupParam, preferredBaseline } from './experiment-conventions';

/**
 * Rows for the Traces tab: each trace joined to the run it belongs to (session id = MLflow
 * run id), so it can be read and filtered by what the experiment varied (variant, case)
 * rather than by session UUID.
 */

export type TraceStatus = 'error' | 'fail' | 'pass' | 'unjudged';

export interface JudgeResult {
  name: string;
  passed: boolean;
  rationale?: string;
}

export interface TraceRow {
  id: string;
  sessionId: string;
  runName: string;
  variant: string;
  caseId: string;
  question: string;
  answer: string;
  /** The case's expected answer, when the SDK put it on the trace (0.4.1+). */
  expected: string | null;
  status: TraceStatus;
  judges: JudgeResult[];
  failedChecks: string[];
  latencyMs: number;
  tokens: number;
  cost: number;
  timestamp: string;
  trace: TraceDetail;
}

interface RunInfo {
  id: string;
  name?: string;
  params?: Array<{ name: string; value: unknown }>;
}

/**
 * Every pass/fail check on the trace: LLM judge steps (output with a boolean `passed`)
 * plus boolean scores, which is how rule-based checks such as pii_leakage are logged.
 * A judge also writes a score under its own name, so scores only add checks that have
 * no judge step; human annotations (human_*) are not checks.
 */
export const judgesOf = (t: TraceDetail): JudgeResult[] => {
  const judges = t.observations
    .filter(isJudge)
    .map(o => ({ o, out: o.output as GenOutput | undefined }))
    .filter(({ out }) => typeof out?.passed === 'boolean')
    .map(({ o, out }) => ({ name: prettyName(o.name), passed: Boolean(out?.passed), rationale: out?.rationale }));
  const seen = new Set(judges.map(j => j.name));
  const rules = (t.scores ?? [])
    .filter(sc => typeof sc.name === 'string' && !isHumanScoreName(sc.name) && (sc.value === 0 || sc.value === 1)
      && (sc.dataType === undefined || sc.dataType === 'BOOLEAN'))
    .map(sc => ({ name: prettyName(sc.name), passed: sc.value === 1, rationale: sc.comment || undefined }))
    .filter(check => !seen.has(check.name) && seen.add(check.name));

  return [...judges, ...rules];
};

export function statusOf(t: TraceDetail, judges: JudgeResult[]): TraceStatus {
  if (t.observations.some(isErrorLevel)) return 'error';
  if (judges.some(j => !j.passed)) return 'fail';

  return judges.length ? 'pass' : 'unjudged';
}

export function toTraceRows(details: TraceDetail[], runs: RunInfo[]): TraceRow[] {
  const runsById = new Map(runs.map(r => [r.id, r]));

  return details.map(t => {
    const run = runsById.get(t.sessionId);
    const params = Object.fromEntries((run?.params ?? []).map(p => [p.name, String(p.value)]));
    const runName = run?.name ?? t.sessionId;
    const judges = judgesOf(t);

    return {
      id: t.id,
      sessionId: t.sessionId,
      runName,
      variant: params[groupParam()] ?? runName,
      caseId: params[caseParam()] ?? '—',
      question: traceQuestion(t),
      answer: traceAnswer(t),
      expected: typeof t.metadata?.expected === 'string' ? t.metadata.expected : null,
      status: statusOf(t, judges),
      judges,
      failedChecks: judges.filter(j => !j.passed).map(j => j.name),
      latencyMs: traceDurationMs(t),
      tokens: sumTraceTokens(t),
      cost: t.totalCost ?? 0,
      timestamp: t.timestamp,
      trace: t,
    };
  });
}

export type StatusFilter = 'all' | 'failing' | 'error' | 'pass';

export interface TraceFilters {
  search: string;
  variants: string[];
  cases: string[];
  status: StatusFilter;
  check: string;
  minLatencyMs: number | null;
}

export const EMPTY_FILTERS: TraceFilters = { search: '', variants: [], cases: [], status: 'all', check: '', minLatencyMs: null };

export function filterTraceRows(rows: TraceRow[], f: TraceFilters): TraceRow[] {
  const needle = f.search.trim().toLowerCase();

  return rows.filter(r => {
    if (needle && !`${r.question}\n${r.answer}`.toLowerCase().includes(needle)) return false;
    if (f.variants.length && !f.variants.includes(r.variant)) return false;
    if (f.cases.length && !f.cases.includes(r.caseId)) return false;
    if (f.status === 'failing' && r.status !== 'fail' && r.status !== 'error') return false;
    if (f.status === 'error' && r.status !== 'error') return false;
    if (f.status === 'pass' && r.status !== 'pass') return false;
    if (f.check && !r.failedChecks.includes(f.check)) return false;
    if (f.minLatencyMs !== null && r.latencyMs < f.minLatencyMs) return false;

    return true;
  });
}

/** Distinct values for the filter menus, sorted. */
export function filterOptions(rows: TraceRow[]) {
  const sorted = (values: Iterable<string>) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

  return {
    variants: sorted(rows.map(r => r.variant)),
    cases: sorted(rows.map(r => r.caseId).filter(c => c !== '—')),
    checks: sorted(rows.flatMap(r => r.judges.map(j => j.name))),
  };
}

/** Query params for a set of filters (the inverse of filtersFromQuery); empty ones are left out. */
export function filtersToQuery(f: Partial<TraceFilters>): URLSearchParams {
  const query = new URLSearchParams();

  if (f.search) query.set('q', f.search);
  if (f.variants?.length) query.set('variant', f.variants.join(','));
  if (f.cases?.length) query.set('case', f.cases.join(','));
  if (f.status && f.status !== 'all') query.set('status', f.status);
  if (f.check) query.set('check', f.check);
  if (f.minLatencyMs) query.set('minLatencyMs', String(f.minLatencyMs));

  return query;
}

/** The query keys filters use, so the Traces tab can replace them without touching others. */
export const FILTER_QUERY_KEYS = ['q', 'variant', 'case', 'status', 'check', 'minLatencyMs'];

/** Filters from URL query params, so other views can link to a pre-filtered list. */
export function filtersFromQuery(query: URLSearchParams): TraceFilters {
  const list = (key: string) => query.getAll(key).flatMap(v => v.split(',')).filter(Boolean);
  const status = query.get('status');
  const latency = Number(query.get('minLatencyMs'));

  return {
    search: query.get('q') ?? '',
    variants: list('variant'),
    cases: list('case'),
    status: status === 'failing' || status === 'error' || status === 'pass' ? status : 'all',
    check: query.get('check') ?? '',
    minLatencyMs: Number.isFinite(latency) && latency > 0 ? latency : null,
  };
}

// ---------------------------------------------------------------------------
// Case grid and baseline comparison
// ---------------------------------------------------------------------------

export interface GridCell {
  variant: string;
  caseId: string;
  rows: TraceRow[];
  passedChecks: number;
  totalChecks: number;
  failing: number;
  errors: number;
}

export interface CaseGrid {
  variants: string[];
  cases: Array<{ caseId: string; question: string }>;
  cell: (caseId: string, variant: string) => GridCell | undefined;
}

/** The variant to compare against: one named "baseline" when present, else the first. */
export const defaultBaseline = (variants: string[]) => preferredBaseline(variants);

/** Cases × variants: every trace of a case under a variant, with its checks pooled across repeats. */
export function caseGrid(rows: TraceRow[]): CaseGrid {
  const cells = new Map<string, GridCell>();
  const questions = new Map<string, string>();

  rows.forEach(r => {
    const key = `${r.caseId}\u0000${r.variant}`;
    const cell = cells.get(key) ?? { variant: r.variant, caseId: r.caseId, rows: [], passedChecks: 0, totalChecks: 0, failing: 0, errors: 0 };

    cell.rows.push(r);
    cell.totalChecks += r.judges.length;
    cell.passedChecks += r.judges.length - r.failedChecks.length;
    if (r.status === 'fail') cell.failing += 1;
    if (r.status === 'error') cell.errors += 1;
    cells.set(key, cell);
    if (!questions.has(r.caseId)) questions.set(r.caseId, r.question);
  });

  const variants = [...new Set(rows.map(r => r.variant))].sort((a, b) => a.localeCompare(b));
  const baseline = defaultBaseline(variants);

  return {
    variants: baseline ? [baseline, ...variants.filter(v => v !== baseline)] : variants,
    cases: [...questions.entries()].map(([caseId, question]) => ({ caseId, question }))// Traces without a case id go last.
      .sort((a, b) => Number(a.caseId === '—') - Number(b.caseId === '—') || a.caseId.localeCompare(b.caseId)),
    cell: (caseId, variant) => cells.get(`${caseId}\u0000${variant}`),
  };
}

/** Traces of the same case under another variant, for a side-by-side comparison. */
export const counterparts = (rows: TraceRow[], row: TraceRow, variant: string) =>
  rows.filter(r => r.variant === variant && r.caseId === row.caseId && r.caseId !== '—');

export interface CheckDiff {
  name: string;
  baseline: boolean | null;
  current: boolean | null;
}

/** Every check on either trace with both verdicts; checks that flipped come first. */
export function checkDiff(current: TraceRow, baseline: TraceRow): CheckDiff[] {
  const verdict = (row: TraceRow, name: string) => row.judges.find(j => j.name === name)?.passed ?? null;
  const names = [...new Set([...current.judges, ...baseline.judges].map(j => j.name))];

  return names
    .map(name => ({ name, baseline: verdict(baseline, name), current: verdict(current, name) }))
    .sort((a, b) => Number(a.baseline === a.current) - Number(b.baseline === b.current) || a.name.localeCompare(b.name));
}
