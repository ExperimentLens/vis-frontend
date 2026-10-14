import {
  collapseAliasedParams,
  EVAL_METRIC_PREFIX,
  inferDirection,
  NOT_SET,
  SIGNIFICANCE_LEVEL,
  summarize,
  varyingParams,
  welchTTest,
} from './run-statistics';
import type { Direction, RunRecord, Summary } from './run-statistics';

/**
 * Evaluation views for runs logged with the experimentlens SDK's `ctx.evaluate()`:
 * per-variant scores, comparison against a baseline variant, and scores over time.
 * The regression rule matches the SDK's `compare()`, so the UI and a CI gate agree.
 */

/** Pass marks the SDK uses by default (see experimentlens/evals.py). */
const SAFETY_EVALS: Record<string, number> = {
  toxicity: 0.75,
  bias: 0.75,
  prompt_injection: 0.75,
  pii_leakage: 1,
};
const QUALITY_PASS_MARK = 0.5;

/** Params the SDK logs that identify a case or a repeat, not a configuration. */
const NON_FACTOR_PARAMS = new Set(['case_id']);

export const isEvalMetric = (metric: string) => metric.startsWith(EVAL_METRIC_PREFIX);

export const evalName = (metric: string) =>
  isEvalMetric(metric) ? metric.slice(EVAL_METRIC_PREFIX.length) : metric;

export const evalLabel = (metric: string) => {
  const name = evalName(metric).replace(/_/g, ' ');

  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const isSafetyEval = (metric: string) => evalName(metric) in SAFETY_EVALS;

export const evalPassMark = (metric: string) => SAFETY_EVALS[evalName(metric)] ?? QUALITY_PASS_MARK;

export type ScoreTone = 'good' | 'warn' | 'bad';

/** Good at or above the pass mark, warn within 0.25 below it, bad further down. */
export const scoreTone = (metric: string, value: number): ScoreTone => {
  const mark = evalPassMark(metric);

  if (value >= mark) return 'good';

  return value >= mark - 0.25 ? 'warn' : 'bad';
};

/** Eval metrics present in the records, quality first, then safety, each alphabetical. */
export function evalMetrics(records: RunRecord[]): string[] {
  const names = new Set<string>();

  records.forEach(r => Object.keys(r.metrics).filter(isEvalMetric).forEach(m => names.add(m)));

  return [...names].sort((a, b) => Number(isSafetyEval(a)) - Number(isSafetyEval(b)) || a.localeCompare(b));
}

/** Params that split the runs into configurations, `variant` first when the SDK logged one. */
export function groupingParams(records: RunRecord[]): string[] {
  const candidates = varyingParams(records).filter(p => !NON_FACTOR_PARAMS.has(p));
  const { params } = collapseAliasedParams(records, candidates);

  return params.includes('variant') ? ['variant', ...params.filter(p => p !== 'variant')] : params;
}

const groupOf = (record: RunRecord, param: string) => record.params[param] ?? NOT_SET;

function valuesByGroup(records: RunRecord[], param: string, metric: string): Map<string, number[]> {
  const groups = new Map<string, number[]>();

  records.forEach(r => {
    const value = r.metrics[metric];

    if (value === undefined) return;
    const key = groupOf(r, param);

    groups.set(key, [...(groups.get(key) ?? []), value]);
  });

  return groups;
}

export interface GroupScores {
  group: string;
  runs: number;
  /** Summary per metric; missing when no run in the group logged it. */
  scores: Record<string, Summary>;
}

/** Mean score per group and metric, best overall average first. */
export function scoresByGroup(records: RunRecord[], param: string, metrics: string[]): GroupScores[] {
  const groups = new Map<string, RunRecord[]>();

  records.forEach(r => groups.set(groupOf(r, param), [...(groups.get(groupOf(r, param)) ?? []), r]));

  const rows = [...groups.entries()].map(([group, runs]) => {
    const scores: Record<string, Summary> = {};

    metrics.forEach(metric => {
      const values = runs.map(r => r.metrics[metric]).filter((v): v is number => v !== undefined);

      if (values.length) scores[metric] = summarize(values);
    });

    return { group, runs: runs.length, scores };
  });

  const average = (row: GroupScores) => {
    const means = Object.values(row.scores).map(s => s.mean);

    return means.length ? means.reduce((a, b) => a + b, 0) / means.length : -Infinity;
  };

  return rows.sort((a, b) => average(b) - average(a) || a.group.localeCompare(b.group));
}

export type ChangeVerdict = 'regressed' | 'improved' | 'noise' | 'unchanged' | 'no-data';

export interface MetricChange {
  metric: string;
  direction: Direction;
  baseline: Summary | null;
  candidate: Summary | null;
  /** candidate − baseline. */
  delta: number | null;
  /** Welch's t-test p-value; null when either side has fewer than two runs. */
  p: number | null;
  verdict: ChangeVerdict;
}

/**
 * How one group's metrics moved against the baseline group. Like the SDK, a change only
 * counts as a regression or improvement when it is beyond `tolerance` and, with at least
 * two runs on each side, significant at 95%; otherwise it is noise.
 */
export function compareToBaseline(
  records: RunRecord[],
  param: string,
  baseline: string,
  candidate: string,
  metrics: string[],
  tolerance = 0,
): MetricChange[] {
  return metrics.map(metric => {
    const groups = valuesByGroup(records, param, metric);
    const base = groups.get(baseline) ?? [];
    const cand = groups.get(candidate) ?? [];
    const direction = inferDirection(metric);

    if (!base.length || !cand.length) {
      return {
        metric,
        direction,
        baseline: base.length ? summarize(base) : null,
        candidate: cand.length ? summarize(cand) : null,
        delta: null,
        p: null,
        verdict: 'no-data' as const,
      };
    }

    const baseSummary = summarize(base);
    const candSummary = summarize(cand);
    const delta = candSummary.mean - baseSummary.mean;
    const test = welchTTest(cand, base);
    const p = test ? test.p : null;
    const better = direction === 'maximize' ? delta : -delta;

    let verdict: ChangeVerdict;

    if (Math.abs(delta) <= tolerance) verdict = 'unchanged';
    else if (p !== null && p >= SIGNIFICANCE_LEVEL) verdict = 'noise';
    else verdict = better > 0 ? 'improved' : 'regressed';

    return { metric, direction, baseline: baseSummary, candidate: candSummary, delta, p, verdict };
  });
}

export interface ScorePoint {
  runId: string;
  runName: string;
  group: string;
  time: number;
  value: number;
}

/** One point per run that logged `metric`, oldest first, for the scores-over-time chart. */
export function scoresOverTime(
  records: RunRecord[],
  startTimeById: Record<string, number | undefined>,
  param: string,
  metric: string,
): ScorePoint[] {
  return records
    .filter(r => r.metrics[metric] !== undefined && startTimeById[r.id] !== undefined)
    .map(r => ({
      runId: r.id,
      runName: r.name,
      group: groupOf(r, param),
      time: startTimeById[r.id] as number,
      value: r.metrics[metric],
    }))
    .sort((a, b) => a.time - b.time);
}
