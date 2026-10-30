/**
 * What the SDK declared about the open experiment, read from its MLflow experiment tags:
 *
 *   experimentlens.metric.<name>  {"pass": 0.75, "direction": "maximize", "kind": "safety"}
 *   experimentlens.group_param    param that names a configuration (SDK: "variant")
 *   experimentlens.case_param     param that names a dataset case (SDK: "case_id")
 *   experimentlens.baseline       configuration to compare others against
 *
 * Every getter falls back to the old naming conventions, so experiments logged without
 * these tags (older SDK, plain MLflow) behave as before. Set once per loaded experiment.
 */
export type MetricKind = 'quality' | 'safety' | 'cost' | 'other';

export interface MetricDefinition {
  pass?: number;
  direction?: 'maximize' | 'minimize';
  kind?: MetricKind;
}

const METRIC_TAG_PREFIX = 'experimentlens.metric.';

/** Cost-like metrics the SDK logs by default; used when the experiment declares none. */
export const DEFAULT_COST_METRICS = ['latency_ms', 'cost_usd', 'total_tokens'];

let tags: Record<string, string> = {};
let metricDefs: Record<string, MetricDefinition> = {};
let experimentId = '';

export function setExperimentConventions(id: string, experimentTags: Record<string, string> | undefined) {
  experimentId = id;
  tags = experimentTags ?? {};
  metricDefs = {};
  Object.entries(tags).forEach(([key, value]) => {
    if (!key.startsWith(METRIC_TAG_PREFIX)) return;
    try {
      metricDefs[key.slice(METRIC_TAG_PREFIX.length)] = JSON.parse(value) as MetricDefinition;
    } catch {
      // A malformed tag just falls back to the name-based guess.
    }
  });
}

export const metricDefinition = (metric: string): MetricDefinition | undefined => metricDefs[metric];

export const groupParam = () => tags['experimentlens.group_param'] || 'variant';

export const caseParam = () => tags['experimentlens.case_param'] || 'case_id';

/** Cost metrics present in the runs: declared ones when the SDK wrote any, else the defaults. */
export function costMetrics(available: (metric: string) => boolean): string[] {
  const declared = Object.keys(metricDefs).filter(m => metricDefs[m].kind === 'cost');

  return (declared.length ? declared : DEFAULT_COST_METRICS).filter(available);
}

const baselineKey = () => `experimentlens.baseline.${experimentId}`;

/** The baseline the user picked in this browser, else the SDK's, else a group named "baseline"; undefined if none. */
export function declaredBaseline(groups: string[]): string | undefined {
  let saved: string | null = null;

  try {
    saved = localStorage.getItem(baselineKey());
  } catch {
    // Storage blocked: fall through to the experiment's own default.
  }

  return [saved, tags['experimentlens.baseline'], 'baseline'].find((b): b is string => Boolean(b) && groups.includes(b as string));
}

/** The declared baseline, else the first group. */
export function preferredBaseline(groups: string[]): string {
  return declaredBaseline(groups) ?? groups[0] ?? '';
}

export function saveBaseline(group: string) {
  try {
    localStorage.setItem(baselineKey(), group);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}
