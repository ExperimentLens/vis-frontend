import type { Observation } from './observation';

/**
 * Shared shape/heuristic helpers for the agentic (experiment_type="llm") views.
 * All field names here are conventions of the Langfuse-style payload, not a
 * typed contract — they are centralized so every LLM view reads them the same
 * way and any drift is fixed in one place.
 */

export const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// Hardcoded until the backend exposes a project mapping per experiment.
export const OBSERVABILITY_PROJECT_ID = 'cmp72x36n0006n207vrcgltju';

export type TokenInfo = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
export type GenInput = { prompt?: string; model?: string; temperature?: number } & Record<string, unknown>;
export type GenOutput = { answer?: string; passed?: boolean; rationale?: string; tokens?: TokenInfo } & Record<string, unknown>;
export type TraceInput = { question?: string } & Record<string, unknown>;
export type TraceOutput = { answer?: string; judge_pass_rate?: number } & Record<string, unknown>;

export const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);

export const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const durationOf = (o: Observation) => {
  const start = Date.parse(o.startTime);
  const end = Date.parse(o.endTime);

  return Number.isNaN(start) || Number.isNaN(end) ? 0 : end - start;
};

export const modelOf = (o: Observation) => (o.input as GenInput)?.model ?? o.model ?? undefined;

export const tokensOf = (o: Observation) => (o.output as GenOutput)?.tokens?.total_tokens;

export const isGeneration = (o: Observation) => (o.type ?? '').toUpperCase() === 'GENERATION';

export const isJudge = (o: Observation) =>
  /judge/i.test(o.name) || typeof (o.output as GenOutput)?.passed === 'boolean';

export const isErrorLevel = (o: Observation) =>
  (o.level ?? '').toUpperCase() === 'ERROR' || Boolean(o.statusMessage);

export const prettyName = (name: string) => name.replace(/^judge_/i, '').replace(/_/g, ' ');
