import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import type { Observation } from '../../../../../shared/models/observability/observation';
import type { GenOutput, TraceInput } from '../../../../../shared/models/observability/agentic-conventions';
import { durationOf, isJudge, prettyName, tokensOf } from '../../../../../shared/models/observability/agentic-conventions';

const traceQuestion = (t: TraceDetail): string => {
  const q = (t.input as TraceInput)?.question;

  return typeof q === 'string' ? q : t.name;
};

export interface AlignedQuestion {
  question: string;
  byRun: Record<string, TraceDetail>;
  runCount: number;
}

/** Group traces across runs by their question (L1 alignment key). */
export const alignByQuestion = (detailsByRun: Record<string, TraceDetail[]>): AlignedQuestion[] => {
  const map = new Map<string, Record<string, TraceDetail>>();

  Object.entries(detailsByRun).forEach(([runId, traces]) => {
    traces.forEach(t => {
      const q = traceQuestion(t);
      const e = map.get(q) ?? {};

      if (!e[runId]) e[runId] = t;
      map.set(q, e);
    });
  });

  return Array.from(map.entries())
    .map(([question, byRun]) => ({ question, byRun, runCount: Object.keys(byRun).length }))
    .sort((a, b) => b.runCount - a.runCount || a.question.localeCompare(b.question));
};

export interface AlignedTaskCell {
  obs: Observation;
  durationMs: number;
  tokens?: number;
  start: number;
}

export interface AlignedTask {
  key: string;
  name: string;
  type: string;
  byRun: Record<string, AlignedTaskCell | undefined>;
}

/** Align tasks across one question's traces by (observation name, occurrence index). */
export const alignTasks = (byRun: Record<string, TraceDetail>): AlignedTask[] => {
  const rows = new Map<string, AlignedTask>();

  Object.entries(byRun).forEach(([runId, trace]) => {
    const occ = new Map<string, number>();

    [...trace.observations]
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
      .forEach(o => {
        const base = o.name || o.type;
        const i = occ.get(base) ?? 0;

        occ.set(base, i + 1);
        const key = `${base}#${i}`;
        const row = rows.get(key) ?? {
          key,
          name: prettyName(base) + (i > 0 ? ` #${i + 1}` : ''),
          type: o.type,
          byRun: {},
        };

        row.byRun[runId] = {
          obs: o,
          durationMs: durationOf(o),
          tokens: tokensOf(o),
          start: Date.parse(o.startTime),
        };
        rows.set(key, row);
      });
  });

  const earliest = (t: AlignedTask) =>
    Math.min(...Object.values(t.byRun).filter(Boolean).map(c => (c as AlignedTaskCell).start));

  return Array.from(rows.values()).sort((a, b) => earliest(a) - earliest(b));
};

export interface AlignedVerdict {
  name: string;
  byRun: Record<string, boolean | undefined>;
}

/** Align judge verdicts / pass-fail checks across one question's traces by name. */
export const alignVerdicts = (byRun: Record<string, TraceDetail>, kind: 'judges' | 'checks'): AlignedVerdict[] => {
  const rows = new Map<string, Record<string, boolean>>();

  Object.entries(byRun).forEach(([runId, trace]) => {
    if (kind === 'judges') {
      trace.observations.filter(isJudge).forEach(o => {
        const name = prettyName(o.name);
        const r = rows.get(name) ?? {};

        r[runId] = (o.output as GenOutput)?.passed === true;
        rows.set(name, r);
      });
    } else {
      trace.scores
        .filter(sc => sc.value === 0 || sc.value === 1)
        .forEach(sc => {
          const name = prettyName(sc.name);
          const r = rows.get(name) ?? {};

          r[runId] = sc.value === 1;
          rows.set(name, r);
        });
    }
  });

  return Array.from(rows.entries())
    .map(([name, runMap]) => ({ name, byRun: runMap }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
