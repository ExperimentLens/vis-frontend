import { formatMs } from '../models/observability/agentic-conventions';
import { compareToBaseline, evalLabel, evalMetrics, evalName, evalPassMark, isEvalMetric, isSafetyEval } from './eval-quality';
import { comparableMetrics, inferDirection, NOT_SET, paretoFrontier, summarize } from './run-statistics';
import type { RunRecord } from './run-statistics';
import type { TraceFilters } from './trace-explorer';

/**
 * The experiment Overview: one quality number, one cost number, and the handful of
 * things that need attention, all derived from run params and metrics.
 */

/** Synthetic per-run metric: the mean of the run's quality eval scores (or a fallback metric). */
export const QUALITY_SCORE = 'quality score';

/** Quality-style metrics to fall back on when no eval scores were logged, best first. */
const QUALITY_HINTS = /(pass|success|correct|accuracy|f1|score)/i;

/** The metric the quality score is built from, for the tile's caption. */
export function qualitySource(records: RunRecord[]): { metrics: string[]; label: string } {
  const quality = evalMetrics(records).filter(m => !isSafetyEval(m));

  if (quality.length) return { metrics: quality, label: `mean of ${quality.length} quality eval${quality.length === 1 ? '' : 's'}` };

  const candidates = comparableMetrics(records).filter(m => inferDirection(m) === 'maximize' && !isEvalMetric(m));
  const fallback = candidates.find(m => QUALITY_HINTS.test(m)) ?? candidates[0];

  return fallback ? { metrics: [fallback], label: fallback } : { metrics: [], label: '' };
}

/** Copies of the records with QUALITY_SCORE added wherever the source metrics were logged. */
export function withQualityScore(records: RunRecord[]): RunRecord[] {
  const { metrics } = qualitySource(records);

  return records.map(r => {
    const values = metrics.map(m => r.metrics[m]).filter((v): v is number => v !== undefined);

    if (!values.length) return r;

    return { ...r, metrics: { ...r.metrics, [QUALITY_SCORE]: values.reduce((a, b) => a + b, 0) / values.length } };
  });
}

/** What a configuration costs: dollars when they were tracked, else latency, else tokens. */
export function pickCostMetric(records: RunRecord[]): string | null {
  const varies = (m: string) => new Set(records.map(r => r.metrics[m]).filter(v => v !== undefined && v !== 0)).size > 0;

  return ['cost_usd', 'latency_ms', 'total_tokens'].find(varies) ?? null;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));

  return sorted[index];
}

/** Values of `metric` in run start order, for a sparkline. */
export function seriesOverTime(records: RunRecord[], startTimeById: Record<string, number | undefined>, metric: string): number[] {
  return records
    .filter(r => r.metrics[metric] !== undefined)
    .sort((a, b) => (startTimeById[a.id] ?? 0) - (startTimeById[b.id] ?? 0))
    .map(r => r.metrics[metric]);
}

/** Whether a run passed every safety eval it logged; null when it logged none. */
export function passedSafety(record: RunRecord): boolean | null {
  const safety = Object.keys(record.metrics).filter(m => isEvalMetric(m) && isSafetyEval(m));

  if (!safety.length) return null;

  return safety.every(m => record.metrics[m] >= evalPassMark(m));
}

export interface VariantPoint {
  group: string;
  runs: number;
  quality: number;
  cost: number;
  /** No other variant is both better and cheaper. */
  frontier: boolean;
}

/** Mean quality and cost per group, flagging the groups on the quality/cost frontier. */
export function variantMap(records: RunRecord[], param: string, costMetric: string): VariantPoint[] {
  const groups = new Map<string, RunRecord[]>();

  records.forEach(r => {
    if (r.metrics[QUALITY_SCORE] === undefined || r.metrics[costMetric] === undefined) return;
    const key = r.params[param] ?? NOT_SET;

    groups.set(key, [...(groups.get(key) ?? []), r]);
  });

  const means: RunRecord[] = [...groups.entries()].map(([group, runs]) => ({
    id: group,
    name: group,
    params: {},
    metrics: {
      [QUALITY_SCORE]: summarize(runs.map(r => r.metrics[QUALITY_SCORE])).mean,
      [costMetric]: summarize(runs.map(r => r.metrics[costMetric])).mean,
    },
  }));
  const frontier = new Set(
    paretoFrontier(means, costMetric, inferDirection(costMetric), QUALITY_SCORE, 'maximize')
      .filter(p => p.optimal)
      .map(p => p.id),
  );

  return means.map(m => ({
    group: m.id,
    runs: groups.get(m.id)?.length ?? 0,
    quality: m.metrics[QUALITY_SCORE],
    cost: m.metrics[costMetric],
    frontier: frontier.has(m.id),
  }));
}

/** Latency as ms/s, everything else to three significant digits. */
const formatValue = (metric: string, value: number) =>
  metric === 'latency_ms' ? formatMs(value) : Number(value.toPrecision(3)).toLocaleString();

export type AttentionSeverity = 'high' | 'medium';

export interface AttentionItem {
  severity: AttentionSeverity;
  title: string;
  detail: string;
  /** Traces-tab filters that show the evidence, when there is a trace-level view of it. */
  traces?: Partial<TraceFilters>;
}

/** The Traces tab names a check like the trace does: eval_pii_leakage → "pii leakage". */
const checkName = (metric: string) => evalName(metric).replace(/_/g, ' ');

export interface RunOutcome {
  status: string;
  params: Record<string, string>;
}

/**
 * What to look at first: groups whose runs fail, groups that regressed against the
 * baseline, and dataset cases that fail a check in most runs whatever the config.
 */
export function attentionItems(
  allRuns: RunOutcome[],
  records: RunRecord[],
  param: string,
  baseline: string,
  metrics: string[],
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const groupOf = (params: Record<string, string>) => params[param] ?? NOT_SET;
  // Traces are filtered by variant; other groupings can't be expressed as a trace filter.
  const variantFilter = (group: string) => (param === 'variant' ? { variants: [group] } : {});

  // Failed runs, per group.
  const failed = new Map<string, { failed: number; total: number }>();

  allRuns.filter(r => r.status !== 'SCHEDULED' && r.status !== 'RUNNING').forEach(r => {
    const entry = failed.get(groupOf(r.params)) ?? { failed: 0, total: 0 };

    entry.total += 1;
    if (r.status === 'FAILED') entry.failed += 1;
    failed.set(groupOf(r.params), entry);
  });
  failed.forEach(({ failed: n, total }, group) => {
    if (n) {
      items.push({
        severity: 'high',
        title: `${group}: ${n} of ${total} runs failed`,
        detail: 'See the errors in the failed traces.',
        traces: { ...variantFilter(group), status: 'error' },
      });
    }
  });

  // Regressions against the baseline: one item per group, eval metrics listed before cost ones.
  const groups = [...new Set(records.map(r => groupOf(r.params)))];

  if (groups.includes(baseline)) {
    groups.filter(g => g !== baseline).sort().forEach(group => {
      const regressed = compareToBaseline(records, param, baseline, group, metrics)
        .filter(c => c.verdict === 'regressed' && c.baseline && c.candidate)
        .sort((a, b) => Number(!isEvalMetric(a.metric)) - Number(!isEvalMetric(b.metric)));

      if (!regressed.length) return;
      const names = regressed.map(c => (isEvalMetric(c.metric) ? evalLabel(c.metric).toLowerCase() : c.metric));

      const firstEval = regressed.find(c => isEvalMetric(c.metric));

      items.push({
        severity: regressed.some(c => isSafetyEval(c.metric)) ? 'high' : 'medium',
        traces: firstEval
          ? { ...variantFilter(group), status: 'failing', check: checkName(firstEval.metric) }
          : variantFilter(group),
        title: `${group}: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''} regressed`,
        detail: regressed
          .map(c => `${c.metric === 'latency_ms' ? 'latency' : isEvalMetric(c.metric) ? evalLabel(c.metric).toLowerCase() : c.metric} `
            + `${formatValue(c.metric, c.baseline!.mean)} → ${formatValue(c.metric, c.candidate!.mean)}`)
          .join(' · '),
      });
    });
  }

  // Cases that fail a check in most runs: a dataset problem, not a config one.
  const evals = metrics.filter(isEvalMetric);
  const byCase = new Map<string, RunRecord[]>();

  records.forEach(r => {
    const caseId = r.params.case_id;

    if (caseId) byCase.set(caseId, [...(byCase.get(caseId) ?? []), r]);
  });
  byCase.forEach((runs, caseId) => {
    evals.forEach(metric => {
      const scored = runs.filter(r => r.metrics[metric] !== undefined);
      const failing = scored.filter(r => r.metrics[metric] < evalPassMark(metric));

      // Only when it fails under every configuration; otherwise a regression above covers it.
      const everyGroup = new Set(scored.map(r => groupOf(r.params))).size === new Set(failing.map(r => groupOf(r.params))).size;

      if (scored.length >= 2 && failing.length / scored.length >= 0.5 && everyGroup) {
        items.push({
          severity: isSafetyEval(metric) ? 'high' : 'medium',
          title: `Case "${caseId}" fails ${evalLabel(metric).toLowerCase()}`,
          traces: { cases: [caseId], check: checkName(metric) },
          detail: `in ${failing.length} of ${scored.length} runs, in every ${param || 'configuration'}`,
        });
      }
    });
  });

  return items.sort((a, b) => Number(a.severity === 'medium') - Number(b.severity === 'medium'));
}
