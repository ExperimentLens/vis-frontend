import {
  EVAL_METRIC_PREFIX,
  NOT_SET,
  SIGNIFICANCE_LEVEL,
  collapseAliasedParams,
  summarize,
  welchTTest,
} from './run-statistics';
import type { Direction, RunRecord, Summary } from './run-statistics';

/**
 * Config Advisor: which configuration to pick for a quality/cost trade-off, and which
 * untested configurations are worth running next.
 *
 * 1. Runs are grouped into configurations (same values of every param that was varied,
 *    ignoring the dataset case), and each run's score is adjusted for how hard its case
 *    is, so configurations that ran on different cases still compare fairly.
 * 2. Recommendations come from measured configurations only: the best one, the
 *    cheapest one within a quality tolerance of it, and the best move from the baseline.
 * 3. A small ridge-regression surrogate per metric (one-hot / polynomial features,
 *    optional pairwise interactions, picked by leave-one-configuration-out
 *    cross-validation) predicts configurations nobody ran, using only param values that
 *    were tried. Its suggestions are hidden when the cross-validated fit is poor.
 *
 * Like run-statistics, this needs params + metrics only and runs in the browser.
 */

/** Synthetic quality metric: mean of every `eval_*` score a run logged. */
export const EVAL_AVERAGE = 'eval_average';

/** Below this leave-one-out R² the surrogate's predictions aren't shown. */
export const MIN_MODEL_R2 = 0.3;

/** Fewer measured configurations than this and a cross-validated fit is mostly luck. */
export const MIN_CONFIGS_FOR_PREDICTION = 8;

/** Most candidate configurations the surrogate scores. */
const MAX_CANDIDATES = 5000;

const BOOTSTRAP_SAMPLES = 30;

/** Adds EVAL_AVERAGE to runs that logged at least two eval scores. */
export function withEvalAverage(records: RunRecord[]): RunRecord[] {
  return records.map(r => {
    const scores = Object.entries(r.metrics)
      .filter(([name]) => name.startsWith(EVAL_METRIC_PREFIX))
      .map(([, value]) => value);

    if (scores.length < 2) return r;

    return { ...r, metrics: { ...r.metrics, [EVAL_AVERAGE]: scores.reduce((a, b) => a + b, 0) / scores.length } };
  });
}

/**
 * Params that define a configuration: every varied param except the case param, and
 * except the group param (a variant name) when real knobs vary too. Params that always
 * change together count once.
 */
export function configKnobs(records: RunRecord[], groupParam: string, caseParam: string): string[] {
  // A param set on only some runs (e.g. `retriever_timeout_rate` on one variant) varies too:
  // its absence is a value of its own.
  const names = [...new Set(records.flatMap(r => Object.keys(r.params)))];
  const varying = names
    .filter(p => p !== caseParam && new Set(records.map(r => r.params[p] ?? NOT_SET)).size > 1)
    .sort();
  const knobs = varying.some(p => p !== groupParam) ? varying.filter(p => p !== groupParam) : varying;

  return collapseAliasedParams(records, knobs).params;
}

const KEY_SEPARATOR = '␟';

export const configKey = (params: Record<string, string>, knobs: string[]) =>
  knobs.map(k => params[k] ?? NOT_SET).join(KEY_SEPARATOR);

// ---------------------------------------------------------------------------
// Measured configurations
// ---------------------------------------------------------------------------

export interface ConfigStats {
  key: string;
  /** Variant name(s) when the runs carry one, else the knob values. */
  name: string;
  values: Record<string, string>;
  runIds: string[];
  cases: number;
  /** Runs of this configuration that failed (not in `runIds`). */
  failed: number;
  /** Case-adjusted quality per run. */
  qualityValues: number[];
  costValues: number[];
  quality: Summary;
  cost: Summary;
  /** No other configuration is at least as good on both and better on one. */
  optimal: boolean;
}

/** Per-case offset from the overall mean, so a hard case doesn't penalise the configs that happened to run it. */
function caseEffects(records: RunRecord[], metric: string, caseParam: string): Map<string, number> {
  const byCase = new Map<string, number[]>();

  records.forEach(r => {
    const value = r.metrics[metric];
    const caseId = r.params[caseParam];

    if (value === undefined || caseId === undefined) return;
    byCase.set(caseId, [...(byCase.get(caseId) ?? []), value]);
  });

  const effects = new Map<string, number>();

  if (byCase.size < 2) return effects;
  const all = [...byCase.values()].flat();
  const grand = all.reduce((a, b) => a + b, 0) / all.length;

  byCase.forEach((values, caseId) => effects.set(caseId, values.reduce((a, b) => a + b, 0) / values.length - grand));

  return effects;
}

const better = (direction: Direction, a: number, b: number) => (direction === 'maximize' ? a > b : a < b);
const atLeast = (direction: Direction, a: number, b: number) => (direction === 'maximize' ? a >= b : a <= b);

export interface Objectives {
  quality: string;
  qualityDirection: Direction;
  cost: string;
  costDirection: Direction;
}

export function measureConfigs(
  records: RunRecord[],
  knobs: string[],
  objectives: Objectives,
  options: { caseParam?: string; groupParam?: string; failedRuns?: Array<Record<string, string>> } = {},
): ConfigStats[] {
  const { quality, cost } = objectives;
  const caseParam = options.caseParam ?? '';
  const qualityEffects = caseParam ? caseEffects(records, quality, caseParam) : new Map<string, number>();
  const costEffects = caseParam ? caseEffects(records, cost, caseParam) : new Map<string, number>();
  const groups = new Map<string, RunRecord[]>();

  records
    .filter(r => r.metrics[quality] !== undefined && r.metrics[cost] !== undefined)
    .forEach(r => {
      const key = configKey(r.params, knobs);

      groups.set(key, [...(groups.get(key) ?? []), r]);
    });

  const failedByKey = new Map<string, number>();

  (options.failedRuns ?? []).forEach(params => {
    const key = configKey(params, knobs);

    failedByKey.set(key, (failedByKey.get(key) ?? 0) + 1);
  });

  const configs = [...groups.entries()].map(([key, runs]) => {
    const values = Object.fromEntries(knobs.map(k => [k, runs[0].params[k] ?? NOT_SET]));
    const adjust = (r: RunRecord, metric: string, effects: Map<string, number>) =>
      r.metrics[metric] - (effects.get(r.params[caseParam]) ?? 0);
    const qualityValues = runs.map(r => adjust(r, quality, qualityEffects));
    const costValues = runs.map(r => adjust(r, cost, costEffects));
    const groupNames = options.groupParam
      ? [...new Set(runs.map(r => r.params[options.groupParam as string]).filter(Boolean))]
      : [];

    return {
      key,
      name: groupNames.length ? groupNames.join(' / ') : describeValues(values),
      values,
      runIds: runs.map(r => r.id),
      cases: new Set(runs.map(r => r.params[caseParam] ?? r.id)).size,
      failed: failedByKey.get(key) ?? 0,
      qualityValues,
      costValues,
      quality: summarize(qualityValues),
      cost: summarize(costValues),
      optimal: false,
    };
  });

  return markFrontier(configs, objectives);
}

function markFrontier(configs: ConfigStats[], { qualityDirection: qd, costDirection: cd }: Objectives): ConfigStats[] {
  return configs.map(c => ({
    ...c,
    optimal: !configs.some(
      o =>
        o !== c
        && atLeast(qd, o.quality.mean, c.quality.mean)
        && atLeast(cd, o.cost.mean, c.cost.mean)
        && (better(qd, o.quality.mean, c.quality.mean) || better(cd, o.cost.mean, c.cost.mean)),
    ),
  }));
}

export const describeValues = (values: Record<string, string>) =>
  Object.entries(values).map(([k, v]) => `${k}=${v}`).join(', ');

// ---------------------------------------------------------------------------
// Recommendations from measured configurations
// ---------------------------------------------------------------------------

export interface ParamChange {
  param: string;
  from: string;
  to: string;
}

export interface Recommendation {
  kind: 'best-quality' | 'same-quality-cheaper' | 'from-baseline';
  config: ConfigStats;
  /** The configuration it is compared with (the best, or the baseline). */
  reference?: ConfigStats;
  changes: ParamChange[];
  /** Signed so that positive is always an improvement. */
  qualityDelta: number;
  /** Relative cost change, signed so that positive is a saving (0.4 = 40% cheaper). */
  costSaving: number;
  /** Welch p-value of the quality difference; null without two runs on each side. */
  qualityP: number | null;
}

export function diffConfigs(from: Record<string, string>, to: Record<string, string>): ParamChange[] {
  return Object.keys(to)
    .filter(k => from[k] !== to[k])
    .map(param => ({ param, from: from[param] ?? NOT_SET, to: to[param] ?? NOT_SET }));
}

function compare(kind: Recommendation['kind'], config: ConfigStats, reference: ConfigStats | undefined, o: Objectives): Recommendation {
  if (!reference) {
    return { kind, config, changes: [], qualityDelta: 0, costSaving: 0, qualityP: null };
  }

  const qSign = o.qualityDirection === 'maximize' ? 1 : -1;
  const cSign = o.costDirection === 'minimize' ? 1 : -1;
  const refCost = reference.cost.mean;

  return {
    kind,
    config,
    reference,
    changes: diffConfigs(reference.values, config.values),
    qualityDelta: qSign * (config.quality.mean - reference.quality.mean),
    costSaving: refCost === 0 ? 0 : (cSign * (refCost - config.cost.mean)) / Math.abs(refCost),
    qualityP: welchTTest(config.qualityValues, reference.qualityValues)?.p ?? null,
  };
}

/** Absolute quality loss accepted: `tolerance` as a share of the best quality's size. */
export const qualityTolerance = (best: ConfigStats, tolerance: number) => tolerance * Math.abs(best.quality.mean);

/** Whether a quality difference is a real drop (significant and beyond the tolerance). */
export const isRealDrop = (rec: Recommendation, toleranceAbs: number) =>
  rec.qualityDelta < -toleranceAbs && rec.qualityP !== null && rec.qualityP < SIGNIFICANCE_LEVEL;

export interface MeasuredAdvice {
  best: Recommendation;
  cheaper: Recommendation | null;
  fromBaseline: Recommendation | null;
  toleranceAbs: number;
}

export function adviseMeasured(
  configs: ConfigStats[],
  objectives: Objectives,
  tolerance: number,
  baselineKey?: string,
): MeasuredAdvice | null {
  if (configs.length === 0) return null;

  const { qualityDirection: qd, costDirection: cd } = objectives;
  const byQualityThenCost = (a: ConfigStats, b: ConfigStats) =>
    (better(qd, a.quality.mean, b.quality.mean) ? -1 : better(qd, b.quality.mean, a.quality.mean) ? 1 : 0)
    || (better(cd, a.cost.mean, b.cost.mean) ? -1 : better(cd, b.cost.mean, a.cost.mean) ? 1 : 0);
  // Configurations that sometimes fail aren't recommended over ones that never do.
  const reliable = configs.filter(c => c.failed === 0);
  const pool = reliable.length ? reliable : configs;
  const best = [...pool].sort(byQualityThenCost)[0];
  const toleranceAbs = qualityTolerance(best, tolerance);
  const floor = qd === 'maximize' ? best.quality.mean - toleranceAbs : best.quality.mean + toleranceAbs;
  const cheapest = pool
    .filter(c => atLeast(qd, c.quality.mean, floor))
    .sort((a, b) => (better(cd, a.cost.mean, b.cost.mean) ? -1 : better(cd, b.cost.mean, a.cost.mean) ? 1 : 0))[0];

  let fromBaseline: Recommendation | null = null;
  const baseline = baselineKey ? configs.find(c => c.key === baselineKey) : undefined;

  if (baseline) {
    const baseFloor = qd === 'maximize' ? baseline.quality.mean - toleranceAbs : baseline.quality.mean + toleranceAbs;
    // The best move: the biggest saving that keeps quality, else the biggest quality gain.
    const options = pool
      .filter(c => c !== baseline)
      .map(c => compare('from-baseline', c, baseline, objectives))
      .filter(r => atLeast(qd, r.config.quality.mean, baseFloor));
    const savings = options.filter(r => r.costSaving > 0).sort((a, b) => b.costSaving - a.costSaving || b.qualityDelta - a.qualityDelta);
    const gains = options.filter(r => r.qualityDelta > toleranceAbs && r.costSaving >= 0).sort((a, b) => b.qualityDelta - a.qualityDelta);

    fromBaseline = gains[0] && (!savings[0] || gains[0].qualityDelta > 2 * toleranceAbs) ? gains[0] : savings[0] ?? null;
  }

  return {
    best: compare('best-quality', best, baseline && baseline !== best ? baseline : undefined, objectives),
    cheaper: cheapest && cheapest !== best ? compare('same-quality-cheaper', cheapest, best, objectives) : null,
    fromBaseline,
    toleranceAbs,
  };
}

// ---------------------------------------------------------------------------
// Surrogate model
// ---------------------------------------------------------------------------

type Feature = (values: Record<string, string>) => number;

interface Encoding {
  names: string[];
  features: Feature[];
}

const isNumeric = (levels: string[]) => levels.every(v => v !== NOT_SET && v.trim() !== '' && Number.isFinite(Number(v)));

export function knobLevels(configs: ConfigStats[], knobs: string[]): Record<string, string[]> {
  return Object.fromEntries(
    knobs.map(k => {
      const levels = [...new Set(configs.map(c => c.values[k]))];

      return [k, isNumeric(levels) ? levels.sort((a, b) => Number(a) - Number(b)) : levels.sort()];
    }),
  );
}

/** Numeric knobs: standardized value (+ square with 3+ levels). Categorical: one-hot, first level dropped. */
function encode(levels: Record<string, string[]>, interactions: boolean): Encoding {
  const perKnob: Array<{ knob: string; names: string[]; features: Feature[] }> = Object.entries(levels).map(([knob, vals]) => {
    if (isNumeric(vals)) {
      const nums = vals.map(Number);
      const mu = nums.reduce((a, b) => a + b, 0) / nums.length;
      const sd = Math.sqrt(nums.reduce((a, b) => a + (b - mu) ** 2, 0) / nums.length) || 1;
      const z: Feature = v => (Number(v[knob]) - mu) / sd;
      const names = [knob];
      const features = [z];

      if (vals.length >= 3) {
        names.push(`${knob}²`);
        features.push(v => z(v) ** 2 - 1);
      }

      return { knob, names, features };
    }

    return {
      knob,
      names: vals.slice(1).map(level => `${knob}=${level}`),
      features: vals.slice(1).map(level => (v: Record<string, string>) => (v[knob] === level ? 1 : 0)),
    };
  });

  const names = perKnob.flatMap(p => p.names);
  const features = perKnob.flatMap(p => p.features);

  if (interactions) {
    // Only first-order terms interact (no z² × anything), which keeps the column count modest.
    const firstOrder = perKnob.map(p => ({
      knob: p.knob,
      cols: p.names.map((n, i) => ({ n, f: p.features[i] })).filter(c => !c.n.endsWith('²')),
    }));

    firstOrder.forEach((a, i) =>
      firstOrder.slice(i + 1).forEach(b =>
        a.cols.forEach(ca =>
          b.cols.forEach(cb => {
            names.push(`${ca.n} × ${cb.n}`);
            features.push(v => ca.f(v) * cb.f(v));
          }),
        ),
      ),
    );
  }

  return { names, features };
}

/** Solves A x = b by Gaussian elimination with partial pivoting (A is small and positive definite here). */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;

    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const p = M[col][col] || 1e-12;

    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / p;

      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  const x = new Array<number>(n).fill(0);

  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];

    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = sum / (M[r][r] || 1e-12);
  }

  return x;
}

interface Row {
  x: number[];
  y: number;
  w: number;
}

interface LinearModel {
  intercept: number;
  coef: number[];
}

/** Weighted ridge regression; the intercept isn't penalised. */
function fitRidge(rows: Row[], lambda: number): LinearModel {
  const p = rows[0]?.x.length ?? 0;
  const W = rows.reduce((a, r) => a + r.w, 0) || 1;
  const xMean = Array.from({ length: p }, (_, j) => rows.reduce((a, r) => a + r.w * r.x[j], 0) / W);
  const yMean = rows.reduce((a, r) => a + r.w * r.y, 0) / W;

  if (p === 0) return { intercept: yMean, coef: [] };

  const A = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const b = new Array<number>(p).fill(0);

  rows.forEach(r => {
    const xc = r.x.map((v, j) => v - xMean[j]);

    for (let i = 0; i < p; i++) {
      b[i] += r.w * xc[i] * (r.y - yMean);
      for (let j = i; j < p; j++) A[i][j] += r.w * xc[i] * xc[j];
    }
  });

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < i; j++) A[i][j] = A[j][i];
    A[i][i] += lambda;
  }

  const coef = solveLinear(A, b);

  return { intercept: yMean - coef.reduce((a, c, j) => a + c * xMean[j], 0), coef };
}

const predictRow = (m: LinearModel, x: number[]) => m.intercept + m.coef.reduce((a, c, j) => a + c * x[j], 0);

/** Deterministic PRNG (mulberry32), so the same runs always give the same suggestions. */
function rng(seed: number) {
  let s = seed >>> 0;

  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SurrogateFit {
  metric: string;
  /** Leave-one-configuration-out R² of the configuration means (on the metric's own scale). */
  r2: number;
  /** Leave-one-configuration-out root mean squared error (on the metric's own scale). */
  rmse: number;
  interactions: boolean;
  lambda: number;
  /** Fitted on log values: effects multiply, and predictions stay positive. */
  logScale: boolean;
  /** Mean prediction and its uncertainty (1.96 × combined CV + bootstrap spread). */
  predict: (values: Record<string, string>) => { mean: number; half: number };
  /** Largest absolute standardized effects (log-scale when `logScale`), for "what the model learned". */
  topTerms: Array<{ term: string; effect: number }>;
}

const LAMBDAS = [0.01, 0.1, 1, 10];

/** Interactions must beat the main-effects model's R² by this much: they extrapolate badly where the grid is sparse. */
const INTERACTION_MARGIN = 0.05;

export interface SurrogateOptions {
  /** Predictions are clamped to this range (the values runs actually produced). */
  bounds?: [number, number];
  /** Fit log(metric) when every value is positive, as costs (tokens, latency, $) are. */
  logScale?: boolean;
}

/** Fits a ridge surrogate of `metric` (per configuration means, weighted by runs) and validates it leave-one-out. */
export function fitSurrogate(
  configs: ConfigStats[],
  knobs: string[],
  pick: (c: ConfigStats) => number,
  metric: string,
  options: SurrogateOptions = {},
): SurrogateFit | null {
  if (configs.length < 4 || knobs.length === 0) return null;

  const [lo, hi] = options.bounds ?? [-Infinity, Infinity];
  const levels = knobLevels(configs, knobs);
  const ys = configs.map(pick);
  const logScale = Boolean(options.logScale) && ys.every(y => y > 0);
  const toFit = (y: number) => (logScale ? Math.log(y) : y);
  const fromFit = (y: number) => (logScale ? Math.exp(y) : y);
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const ssTotal = configs.reduce((a, c, i) => a + c.runIds.length * (ys[i] - yMean) ** 2, 0);

  if (ssTotal === 0) return null;

  type Candidate = { r2: number; rmse: number; interactions: boolean; lambda: number; enc: Encoding };
  const best: Partial<Record<'main' | 'interactions', Candidate>> = {};

  for (const interactions of [false, true]) {
    const enc = encode(levels, interactions);

    // More columns than configurations only works with a strong penalty; skip hopeless fits.
    if (interactions && enc.names.length > 4 * configs.length) continue;
    const rows: Row[] = configs.map((c, i) => ({ x: enc.features.map(f => f(c.values)), y: toFit(ys[i]), w: c.runIds.length }));
    const slot = interactions ? 'interactions' : 'main';

    for (const lambda of LAMBDAS) {
      let ssErr = 0;
      let wSum = 0;

      rows.forEach((row, i) => {
        const model = fitRidge(rows.filter((_, k) => k !== i), lambda * rows.length);
        const err = fromFit(predictRow(model, row.x)) - ys[i];

        ssErr += row.w * err * err;
        wSum += row.w;
      });

      const r2 = 1 - ssErr / ssTotal;

      if (!best[slot] || r2 > (best[slot] as Candidate).r2) {
        best[slot] = { r2, rmse: Math.sqrt(ssErr / wSum), interactions, lambda, enc };
      }
    }
  }

  const chosen = best.interactions && (!best.main || best.interactions.r2 > best.main.r2 + INTERACTION_MARGIN)
    ? best.interactions
    : best.main;

  if (!chosen) return null;

  const { enc, lambda, interactions, rmse, r2 } = chosen;
  const rows: Row[] = configs.map((c, i) => ({ x: enc.features.map(f => f(c.values)), y: toFit(ys[i]), w: c.runIds.length }));
  const full = fitRidge(rows, lambda * rows.length);
  const random = rng(rows.length * 7919 + Math.round(Math.abs(yMean) * 1000));
  const boots = Array.from({ length: BOOTSTRAP_SAMPLES }, () =>
    fitRidge(rows.map(() => rows[Math.floor(random() * rows.length)]), lambda * rows.length),
  );

  return {
    metric,
    r2,
    rmse,
    interactions,
    lambda,
    logScale,
    predict: values => {
      const x = enc.features.map(f => f(values));
      const mean = Math.min(hi, Math.max(lo, fromFit(predictRow(full, x))));
      const bootPreds = boots.map(m => fromFit(predictRow(m, x)));
      const bootMean = bootPreds.reduce((a, b) => a + b, 0) / bootPreds.length;
      const bootVar = bootPreds.reduce((a, b) => a + (b - bootMean) ** 2, 0) / Math.max(1, bootPreds.length - 1);

      return { mean, half: 1.96 * Math.sqrt(rmse ** 2 + bootVar) };
    },
    topTerms: enc.names
      .map((term, j) => ({ term, effect: full.coef[j] }))
      .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
      .slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// Untested configurations worth running
// ---------------------------------------------------------------------------

export interface Suggestion {
  values: Record<string, string>;
  quality: { mean: number; half: number };
  cost: { mean: number; half: number };
  /** Relative cost change against the reference, positive = saving. */
  costSaving: number;
  qualityDelta: number;
  reference: ConfigStats;
  changes: ParamChange[];
  reason: 'cheaper' | 'better';
}

/** Every combination of the param values that were tried, capped at MAX_CANDIDATES. */
export function candidateConfigs(levels: Record<string, string[]>): Array<Record<string, string>> {
  const knobs = Object.keys(levels);
  let combos: Array<Record<string, string>> = [{}];

  for (const knob of knobs) {
    combos = combos.flatMap(c => levels[knob].map(v => ({ ...c, [knob]: v })));
    if (combos.length > MAX_CANDIDATES) return combos.slice(0, MAX_CANDIDATES);
  }

  return knobs.length ? combos : [];
}

export interface Prediction {
  quality: SurrogateFit;
  cost: SurrogateFit;
  /** Both fits are good enough to act on. */
  reliable: boolean;
  untested: number;
  suggestions: Suggestion[];
}

/**
 * Untested configurations predicted to beat the measured ones: cheaper than the
 * cheapest measured config at near-best quality, or better than the best measured one.
 */
export function predictUntested(
  configs: ConfigStats[],
  knobs: string[],
  objectives: Objectives,
  advice: MeasuredAdvice,
  limit = 5,
): Prediction | null {
  const range = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];
  const quality = fitSurrogate(configs, knobs, c => c.quality.mean, objectives.quality, {
    bounds: range(configs.flatMap(c => c.qualityValues)),
  });
  const cost = fitSurrogate(configs, knobs, c => c.cost.mean, objectives.cost, {
    bounds: range(configs.flatMap(c => c.costValues)),
    logScale: true,
  });

  if (!quality || !cost) return null;

  const measured = new Set(configs.map(c => c.key));
  const untested = candidateConfigs(knobLevels(configs, knobs)).filter(v => !measured.has(configKey(v, knobs)));
  const { qualityDirection: qd, costDirection: cd } = objectives;
  const qSign = qd === 'maximize' ? 1 : -1;
  const cSign = cd === 'minimize' ? 1 : -1;
  const best = advice.best.config;
  const cheapRef = advice.cheaper?.config ?? best;
  const floor = best.quality.mean - qSign * advice.toleranceAbs;

  // A prediction vaguer than the whole spread of measured configurations says nothing.
  const spread = (pick: (c: ConfigStats) => number) => Math.max(...configs.map(pick)) - Math.min(...configs.map(pick));
  const qualitySpread = spread(c => c.quality.mean);
  const costSpread = spread(c => c.cost.mean);
  const scored = untested.map(values => {
    const q = quality.predict(values);
    const c = cost.predict(values);

    return { values, q, c };
  });

  const toSuggestion = (s: (typeof scored)[number], reference: ConfigStats, reason: Suggestion['reason']): Suggestion => ({
    values: s.values,
    quality: s.q,
    cost: s.c,
    costSaving: reference.cost.mean === 0 ? 0 : (cSign * (reference.cost.mean - s.c.mean)) / Math.abs(reference.cost.mean),
    qualityDelta: qSign * (s.q.mean - reference.quality.mean),
    reference,
    changes: diffConfigs(reference.values, s.values),
    reason,
  });

  const cheaper = scored
    .filter(s => s.q.half < qualitySpread && s.c.half < costSpread)
    .filter(s => atLeast(qd, s.q.mean, floor) && better(cd, s.c.mean, cheapRef.cost.mean))
    .map(s => toSuggestion(s, cheapRef, 'cheaper'))
    .sort((a, b) => b.costSaving - a.costSaving);
  const higher = scored
    .filter(s => s.q.half < qualitySpread && s.c.half < costSpread)
    .filter(s => better(qd, s.q.mean, best.quality.mean + qSign * advice.toleranceAbs))
    .map(s => toSuggestion(s, best, 'better'))
    .sort((a, b) => b.qualityDelta - a.qualityDelta);

  // Alternate the two kinds so both show up, each list in its own order.
  const suggestions: Suggestion[] = [];

  for (let i = 0; suggestions.length < limit && (i < cheaper.length || i < higher.length); i++) {
    if (cheaper[i]) suggestions.push(cheaper[i]);
    if (higher[i] && suggestions.length < limit) suggestions.push(higher[i]);
  }

  return {
    quality,
    cost,
    reliable: configs.length >= MIN_CONFIGS_FOR_PREDICTION && quality.r2 >= MIN_MODEL_R2 && cost.r2 >= MIN_MODEL_R2,
    untested: untested.length,
    suggestions,
  };
}
