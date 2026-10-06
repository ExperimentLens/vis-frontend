import type { IRun } from '../models/experiment/run.model';

/**
 * Statistics behind the Insights tab: which params drive a metric, whether one param
 * value is really better than another, and which runs sit on the trade-off frontier.
 *
 * Everything works on params + metrics only, so it applies equally to ML runs and
 * LLM sessions, and needs no backend. Repeated runs of the same configuration are
 * what make the confidence intervals and p-values meaningful.
 */

export interface RunRecord {
  id: string;
  name: string;
  params: Record<string, string>;
  metrics: Record<string, number>;
}

export type Direction = 'maximize' | 'minimize';

/** Group label for runs that never logged the param. */
export const NOT_SET = '(not set)';

export const SIGNIFICANCE_LEVEL = 0.05;

// ---------------------------------------------------------------------------
// Runs → records
// ---------------------------------------------------------------------------

/** Final value of each metric: the highest step, else the latest timestamp (as the runs table does). */
export function latestMetricValues(run: IRun): Record<string, number> {
  const latest = new Map<string, { value: number; step?: number; timestamp: number }>();

  for (const metric of run.metrics ?? []) {
    const current = latest.get(metric.name);
    const hasSteps = current?.step !== undefined && current?.step !== null
      && metric.step !== undefined && metric.step !== null;
    const isNewer = !current
      || (hasSteps ? (metric.step as number) > (current.step as number) : metric.timestamp > current.timestamp);

    if (isNewer) latest.set(metric.name, metric);
  }

  const values: Record<string, number> = {};

  latest.forEach((metric, name) => {
    const value = Number(metric.value);

    if (Number.isFinite(value)) values[name] = value;
  });

  return values;
}

/** Completed runs only: running or failed runs carry partial metrics that would skew the comparison. */
export function toRunRecords(runs: IRun[]): RunRecord[] {
  return runs
    .filter(run => run.status === 'COMPLETED')
    .map(run => ({
      id: run.id,
      name: run.name ?? run.id,
      params: Object.fromEntries((run.params ?? []).map(p => [p.name, String(p.value)])),
      metrics: latestMetricValues(run),
    }));
}

/** Metrics logged by at least two runs, the minimum for any comparison. */
export function comparableMetrics(records: RunRecord[]): string[] {
  const counts = new Map<string, number>();

  records.forEach(r => Object.keys(r.metrics).forEach(m => counts.set(m, (counts.get(m) ?? 0) + 1)));

  return [...counts.entries()].filter(([, n]) => n >= 2).map(([m]) => m).sort();
}

/** Params that take more than one value across the runs, fewest distinct values first. */
export function varyingParams(records: RunRecord[]): string[] {
  const values = new Map<string, Set<string>>();

  records.forEach(r =>
    Object.entries(r.params).forEach(([k, v]) => {
      if (!values.has(k)) values.set(k, new Set());
      values.get(k)?.add(v);
    }),
  );

  return [...values.entries()]
    .filter(([, set]) => set.size > 1)
    .sort(([a, sa], [b, sb]) => sa.size - sb.size || a.localeCompare(b))
    .map(([k]) => k);
}

export interface ParamGroups {
  /** One param per distinct way of splitting the runs. */
  params: string[];
  /** Params dropped because they split the runs exactly like the kept one. */
  aliases: Record<string, string[]>;
}

/**
 * Collapse params that always change together, e.g. a `variant` name and the
 * `system_prompt` it stands for. Analysing both would just repeat the same result;
 * a named (non-numeric) param is kept if there is one, then the one with the
 * shortest values, because it reads best in charts.
 */
export function collapseAliasedParams(records: RunRecord[], params: string[]): ParamGroups {
  const bySplit = new Map<string, string[]>();

  params.forEach(param => {
    const ids = new Map<string, number>();
    const split = records
      .map(r => {
        const value = r.params[param] ?? NOT_SET;

        if (!ids.has(value)) ids.set(value, ids.size);

        return ids.get(value);
      })
      .join(',');

    bySplit.set(split, [...(bySplit.get(split) ?? []), param]);
  });

  const longestValue = (param: string) => Math.max(...records.map(r => (r.params[param] ?? NOT_SET).length));
  // Named values ("rag_dense_context") explain a result better than the numbers that
  // come with them ("chunk_size = 700"); "-" and missing values don't count either way.
  const isNumeric = (param: string) =>
    records.every(r => {
      const value = r.params[param];

      return value === undefined || value === '' || value === '-' || !Number.isNaN(Number(value));
    });
  const aliases: Record<string, string[]> = {};
  const kept: string[] = [];

  bySplit.forEach(group => {
    const [keep, ...rest] = [...group].sort(
      (a, b) => Number(isNumeric(a)) - Number(isNumeric(b)) || longestValue(a) - longestValue(b),
    );

    kept.push(keep);
    if (rest.length) aliases[keep] = rest;
  });

  return { params: params.filter(p => kept.includes(p)), aliases };
}

// Checked in order: unmistakable "bad" words, then quality words, then cost-like words.
// So `latency_check_passed` and `token_f1` count as quality, but `hallucination_score` doesn't.
const ALWAYS_MINIMIZE = /(loss|error|err$|_err_|mse|mae|rmse|mape|perplexity|wer|cer|fpr|fnr|toxicity|hallucination)/i;
const MAXIMIZE = /(f1|accuracy|precision|recall|auc|score|pass|hit|mrr|ndcg|coverage|correct|grounded|faithful|relevan|success|bleu|rouge|exact_match|truth)/i;
const MINIMIZE = /(latency|duration|time|_ms$|_s$|seconds|cost|token)/i;

/** Best guess at whether higher or lower is better, from the metric's name. */
export function inferDirection(metric: string): Direction {
  if (ALWAYS_MINIMIZE.test(metric)) return 'minimize';
  if (MAXIMIZE.test(metric)) return 'maximize';

  return MINIMIZE.test(metric) ? 'minimize' : 'maximize';
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

/** ln Γ(x), Lanczos approximation (g = 7, n = 9). */
function logGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);

  const z = x - 1;
  let sum = c[0];

  for (let i = 1; i < 9; i++) sum += c[i] / (z + i);
  const t = z + 7.5;

  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

/** Continued fraction for the incomplete beta function (modified Lentz). */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);

  d = Math.abs(d) < tiny ? tiny : d;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));

    d = 1 + aa * d;
    d = Math.abs(d) < tiny ? tiny : d;
    c = 1 + aa / c;
    c = Math.abs(c) < tiny ? tiny : c;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    d = Math.abs(d) < tiny ? tiny : d;
    c = 1 + aa / c;
    c = Math.abs(c) < tiny ? tiny : c;
    d = 1 / d;
    const delta = d * c;

    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }

  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );

  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(x, a, b)) / a
    : 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

/** Two-sided p-value of Student's t statistic with `df` degrees of freedom. */
export function tTestPValue(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;

  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

/** Upper-tail p-value of an F statistic with (d1, d2) degrees of freedom. */
export function fTestPValue(f: number, d1: number, d2: number): number {
  if (!Number.isFinite(f)) return 0;
  if (f <= 0) return 1;

  return incompleteBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
}

/** Two-sided critical t value for a 95% interval. */
export function tCritical95(df: number): number {
  let lo = 0;
  let hi = 1000;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;

    if (tTestPValue(mid, df) > SIGNIFICANCE_LEVEL) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// Descriptive statistics and tests
// ---------------------------------------------------------------------------

export interface Summary {
  n: number;
  mean: number;
  /** Sample standard deviation (n − 1); 0 for a single value. */
  std: number;
  /** 95% confidence interval for the mean; collapses to the mean when n = 1. */
  ciLow: number;
  ciHigh: number;
  min: number;
  max: number;
}

// Summing identical floats can land one ulp off (nine runs with recall 0.98591…
// average to 0.98591… − 2e-16), and that phantom spread would read as a real effect.
// Identical values therefore get an exact mean, and spread at rounding level counts as none.
const ROUNDING_TOLERANCE = 1e-12;

const mean = (xs: number[]) =>
  xs.every(x => x === xs[0]) ? xs[0] : xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sum of squared deviations from `center`, zeroed when it is only rounding error. */
const sumOfSquares = (xs: number[], center: number) => {
  const ss = xs.reduce((acc, x) => acc + (x - center) ** 2, 0);
  const scale = xs.reduce((acc, x) => acc + x * x, 0);

  return ss <= ROUNDING_TOLERANCE * scale ? 0 : ss;
};

const variance = (xs: number[]) => (xs.length < 2 ? 0 : sumOfSquares(xs, mean(xs)) / (xs.length - 1));

export function summarize(values: number[]): Summary {
  const n = values.length;
  const m = mean(values);
  const std = Math.sqrt(variance(values));
  const half = n > 1 ? (tCritical95(n - 1) * std) / Math.sqrt(n) : 0;

  return {
    n,
    mean: m,
    std,
    ciLow: m - half,
    ciHigh: m + half,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export interface WelchResult {
  t: number;
  df: number;
  p: number;
}

/** Welch's t-test (unequal variances). Needs at least two values per group. */
export function welchTTest(a: number[], b: number[]): WelchResult | null {
  if (a.length < 2 || b.length < 2) return null;

  const va = variance(a) / a.length;
  const vb = variance(b) / b.length;
  const diff = mean(a) - mean(b);

  if (va + vb === 0) {
    // No noise at all: any difference is exact.
    return { t: diff === 0 ? 0 : Infinity, df: a.length + b.length - 2, p: diff === 0 ? 1 : 0 };
  }

  const t = diff / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));

  return { t, df, p: tTestPValue(t, df) };
}

/** Cohen's d with pooled standard deviation; null when it is undefined. */
export function cohensD(a: number[], b: number[]): number | null {
  if (a.length < 2 || b.length < 2) return null;

  const pooled = Math.sqrt(
    ((a.length - 1) * variance(a) + (b.length - 1) * variance(b)) / (a.length + b.length - 2),
  );

  return pooled === 0 ? null : (mean(a) - mean(b)) / pooled;
}

/** Holm–Bonferroni adjustment, so comparing many values against the best doesn't inflate false positives. */
export function holmAdjust(pValues: number[]): number[] {
  const order = pValues.map((p, i) => ({ p, i })).sort((x, y) => x.p - y.p);
  const adjusted = new Array<number>(pValues.length);
  let running = 0;

  order.forEach(({ p, i }, rank) => {
    running = Math.max(running, Math.min(1, (pValues.length - rank) * p));
    adjusted[i] = running;
  });

  return adjusted;
}

// ---------------------------------------------------------------------------
// Experiment-level analyses
// ---------------------------------------------------------------------------

function groupByParam(records: RunRecord[], param: string, metric: string): Map<string, number[]> {
  const groups = new Map<string, number[]>();

  records.forEach(r => {
    const value = r.metrics[metric];

    if (value === undefined) return;
    const key = r.params[param] ?? NOT_SET;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(value);
  });

  return groups;
}

export interface ParamImpact {
  param: string;
  /** Number of distinct values of the param among runs that logged the metric. */
  levels: number;
  runs: number;
  /** Share of the metric's variance explained by this param (η², 0–1). */
  etaSquared: number;
  /** One-way ANOVA p-value; null without repeated runs per value. */
  p: number | null;
  /** False when every value was run once, so effect and noise can't be told apart. */
  replicated: boolean;
}

/** One-way ANOVA of `metric` across the values of each param, strongest effect first. */
export function rankParamImpact(records: RunRecord[], params: string[], metric: string): ParamImpact[] {
  return params
    .map(param => {
      const groups = [...groupByParam(records, param, metric).values()];
      const all = groups.flat();

      if (groups.length < 2 || all.length < 3) return null;

      const grand = mean(all);
      const ssTotal = sumOfSquares(all, grand);
      const ssWithin = groups.reduce((acc, g) => acc + sumOfSquares(g, mean(g)), 0);
      const ssBetween = Math.max(0, ssTotal - ssWithin);
      const dfBetween = groups.length - 1;
      const dfWithin = all.length - groups.length;
      const replicated = dfWithin > 0;

      let p: number | null = null;

      if (ssTotal === 0) p = 1;
      else if (replicated) {
        p = ssWithin <= ROUNDING_TOLERANCE * ssTotal
          ? 0
          : fTestPValue(ssBetween / dfBetween / (ssWithin / dfWithin), dfBetween, dfWithin);
      }

      return {
        param,
        levels: groups.length,
        runs: all.length,
        etaSquared: ssTotal === 0 ? 0 : ssBetween / ssTotal,
        p,
        replicated,
      };
    })
    .filter((x): x is ParamImpact => x !== null)
    .sort((a, b) => b.etaSquared - a.etaSquared || a.param.localeCompare(b.param));
}

export type Verdict = 'best' | 'tie' | 'worse' | 'insufficient';

export interface GroupComparison extends Summary {
  value: string;
  /** Difference from the best value's mean, signed so that negative is always worse. */
  deltaVsBest: number;
  /** Holm-adjusted Welch p-value against the best value. */
  p: number | null;
  /** Cohen's d against the best value. */
  d: number | null;
  verdict: Verdict;
}

/** Mean ± 95% CI of `metric` for each value of `param`, compared against the best value. */
export function compareParamValues(
  records: RunRecord[],
  param: string,
  metric: string,
  direction: Direction,
): GroupComparison[] {
  const sign = direction === 'maximize' ? 1 : -1;
  const groups = [...groupByParam(records, param, metric).entries()]
    .map(([value, values]) => ({ value, values, summary: summarize(values) }))
    .sort((a, b) => sign * (b.summary.mean - a.summary.mean) || a.value.localeCompare(b.value, undefined, { numeric: true }));

  if (groups.length === 0) return [];

  const best = groups[0];
  const allTied = groups.length > 1 && groups.every(g => g.summary.mean === best.summary.mean);
  const tests = groups.slice(1).map(g => welchTTest(g.values, best.values));
  const tested = tests.flatMap((t, i) => (t ? [{ i, p: t.p }] : []));
  const adjusted = holmAdjust(tested.map(t => t.p));
  const adjustedByIndex = new Map(tested.map((t, k) => [t.i, adjusted[k]]));

  return groups.map((g, index) => {
    if (index === 0) {
      // When every value scored exactly the same there is no winner to name.
      const verdict: Verdict = allTied ? 'tie' : 'best';

      return { ...g.summary, value: g.value, deltaVsBest: 0, p: null, d: null, verdict };
    }

    const p = adjustedByIndex.get(index - 1) ?? null;
    const verdict: Verdict = p === null ? 'insufficient' : p < SIGNIFICANCE_LEVEL ? 'worse' : 'tie';

    return {
      ...g.summary,
      value: g.value,
      deltaVsBest: sign * (g.summary.mean - best.summary.mean),
      p,
      d: cohensD(g.values, best.values),
      verdict,
    };
  });
}

export interface FrontierPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Not beaten on both metrics by any other run. */
  optimal: boolean;
}

/** Runs that no other run beats on both metrics at once (the Pareto frontier). */
export function paretoFrontier(
  records: RunRecord[],
  xMetric: string,
  xDirection: Direction,
  yMetric: string,
  yDirection: Direction,
): FrontierPoint[] {
  const sx = xDirection === 'maximize' ? 1 : -1;
  const sy = yDirection === 'maximize' ? 1 : -1;
  const points = records
    .filter(r => r.metrics[xMetric] !== undefined && r.metrics[yMetric] !== undefined)
    .map(r => ({ id: r.id, name: r.name, x: r.metrics[xMetric], y: r.metrics[yMetric] }));

  return points.map(p => ({
    ...p,
    optimal: !points.some(
      q => sx * q.x >= sx * p.x && sy * q.y >= sy * p.y && (sx * q.x > sx * p.x || sy * q.y > sy * p.y),
    ),
  }));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatStat(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';
  const abs = Math.abs(value);

  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return value.toExponential(2);

  return Number(value.toPrecision(4)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function formatPValue(p: number | null): string {
  if (p === null) return '—';

  return p < 0.001 ? '< 0.001' : p.toFixed(3);
}
