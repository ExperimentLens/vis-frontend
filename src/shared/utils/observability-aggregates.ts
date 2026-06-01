import type { TraceDetail } from '../models/observability/trace-detail';
import {
  durationOf,
  isErrorLevel,
  isGeneration,
  isJudge,
  modelOf,
  prettyName,
  tokensOf,
} from '../models/observability/agentic-conventions';
import type { GenOutput, TraceInput } from '../models/observability/agentic-conventions';

const quantile = (sorted: number[], q: number): number => {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
};

/** Wall-clock duration of a trace, in ms, from its observation timestamps. */
export const traceDurationMs = (t: TraceDetail): number => {
  const times = t.observations
    .flatMap(o => [Date.parse(o.startTime), Date.parse(o.endTime)])
    .filter(n => !Number.isNaN(n));

  if (times.length) return Math.max(...times) - Math.min(...times);

  return (t.latency ?? 0) * 1000;
};

const sumTraceTokens = (t: TraceDetail): number =>
  t.observations.reduce((s, o) => s + (tokensOf(o) ?? 0), 0);

const traceQuestion = (t: TraceDetail): string => {
  const q = (t.input as TraceInput)?.question;

  return typeof q === 'string' ? q : t.name;
};

export interface ExperimentRollup {
  traceCount: number;
  totalCost: number;
  totalTokens: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  judgePassRate: number | null;
  checkPassRate: number | null;
  errorRate: number;
}

/** One rollup over a flat list of traces — used for the whole experiment and per session. */
export const rollup = (details: TraceDetail[]): ExperimentRollup => {
  const traceCount = details.length;
  const latencies = details.map(traceDurationMs).sort((a, b) => a - b);
  const totalCost = details.reduce((s, t) => s + (t.totalCost ?? 0), 0);
  const totalTokens = details.reduce((s, t) => s + sumTraceTokens(t), 0);
  const avgLatencyMs = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  let judgePass = 0;
  let judgeTotal = 0;
  let checkPass = 0;
  let checkTotal = 0;
  let errorTraces = 0;

  details.forEach(t => {
    t.observations.forEach(o => {
      if (isJudge(o)) {
        judgeTotal++;
        if ((o.output as GenOutput)?.passed === true) judgePass++;
      }
    });
    t.scores.forEach(sc => {
      if (sc.value === 0 || sc.value === 1) {
        checkTotal++;
        if (sc.value === 1) checkPass++;
      }
    });
    if (t.observations.some(isErrorLevel)) errorTraces++;
  });

  return {
    traceCount,
    totalCost,
    totalTokens,
    avgLatencyMs,
    p50LatencyMs: quantile(latencies, 0.5),
    p95LatencyMs: quantile(latencies, 0.95),
    judgePassRate: judgeTotal ? judgePass / judgeTotal : null,
    checkPassRate: checkTotal ? checkPass / checkTotal : null,
    errorRate: traceCount ? errorTraces / traceCount : 0,
  };
};

export interface AgentProfile {
  name: string;
  displayName: string;
  type: string;
  count: number;
  avgMs: number;
  totalTokens: number;
}

/** Per-agent (grouped by observation name) latency + token profile across traces. */
export const perAgentProfile = (details: TraceDetail[]): AgentProfile[] => {
  const map = new Map<string, { type: string; count: number; totalMs: number; totalTokens: number }>();

  details.forEach(t =>
    t.observations.forEach(o => {
      const key = o.name || o.type;
      const e = map.get(key) ?? { type: o.type, count: 0, totalMs: 0, totalTokens: 0 };

      e.count++;
      e.totalMs += durationOf(o);
      e.totalTokens += tokensOf(o) ?? 0;
      map.set(key, e);
    }),
  );

  return Array.from(map.entries())
    .map(([name, e]) => ({
      name,
      displayName: prettyName(name),
      type: e.type,
      count: e.count,
      avgMs: e.count ? e.totalMs / e.count : 0,
      totalTokens: e.totalTokens,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
};

export interface FreqItem {
  key: string;
  count: number;
  perTrace: number;
}

export const callFrequency = (details: TraceDetail[], by: 'type' | 'name'): FreqItem[] => {
  const map = new Map<string, number>();

  details.forEach(t =>
    t.observations.forEach(o => {
      const key = by === 'type' ? (o.type || 'UNKNOWN') : (prettyName(o.name) || o.type);

      map.set(key, (map.get(key) ?? 0) + 1);
    }),
  );

  const n = details.length || 1;

  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count, perTrace: count / n }))
    .sort((a, b) => b.count - a.count);
};

export interface DistField {
  field: string;
  items: { value: string; count: number }[];
}

/** Routing/config decisions: distribution of each trace.input key (minus question) + model. */
export const routingDistribution = (details: TraceDetail[]): DistField[] => {
  const fields = new Map<string, Map<string, number>>();
  const add = (field: string, value: string) => {
    const m = fields.get(field) ?? new Map<string, number>();

    m.set(value, (m.get(value) ?? 0) + 1);
    fields.set(field, m);
  };

  details.forEach(t => {
    const input = (t.input ?? {}) as Record<string, unknown>;

    Object.entries(input).forEach(([k, v]) => {
      if (k === 'question') return;
      add(k, String(v));
    });
    t.observations.forEach(o => {
      const m = modelOf(o);

      if (m) add('model', m);
    });
  });

  return Array.from(fields.entries()).map(([field, m]) => ({
    field,
    items: Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
  }));
};

export interface VerdictRate {
  name: string;
  passRate: number;
  total: number;
}

export const verdictPassRates = (details: TraceDetail[], kind: 'judges' | 'checks'): VerdictRate[] => {
  const pass = new Map<string, number>();
  const total = new Map<string, number>();

  details.forEach(t => {
    if (kind === 'judges') {
      t.observations.filter(isJudge).forEach(o => {
        const name = prettyName(o.name);

        total.set(name, (total.get(name) ?? 0) + 1);
        if ((o.output as GenOutput)?.passed === true) pass.set(name, (pass.get(name) ?? 0) + 1);
      });
    } else {
      t.scores
        .filter(sc => sc.value === 0 || sc.value === 1)
        .forEach(sc => {
          const name = prettyName(sc.name);

          total.set(name, (total.get(name) ?? 0) + 1);
          if (sc.value === 1) pass.set(name, (pass.get(name) ?? 0) + 1);
        });
    }
  });

  return Array.from(total.entries())
    .map(([name, t]) => ({ name, total: t, passRate: (pass.get(name) ?? 0) / t }))
    .sort((a, b) => a.passRate - b.passRate);
};

export interface TraceMetric {
  traceId: string;
  sessionId: string;
  question: string;
  latencyMs: number;
  tokens: number;
  cost: number;
}

/** Flat per-trace metrics for distributions / scatter. */
export const perTraceMetrics = (details: TraceDetail[]): TraceMetric[] =>
  details.map(t => ({
    traceId: t.id,
    sessionId: t.sessionId,
    question: traceQuestion(t),
    latencyMs: traceDurationMs(t),
    tokens: sumTraceTokens(t),
    cost: t.totalCost ?? 0,
  }));

/* ---------- simple Langfuse-style aggregates ---------- */

export interface TopTrace { name: string; count: number }

export const topTraceNames = (details: TraceDetail[], top = 5): TopTrace[] => {
  const m = new Map<string, number>();

  details.forEach(t => {
    const k = t.name || '(unnamed)';

    m.set(k, (m.get(k) ?? 0) + 1);
  });

  return Array.from(m.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
};

export interface ModelUsageRow { model: string; tokens: number; generations: number }

export const modelUsageTable = (details: TraceDetail[]): ModelUsageRow[] => {
  const m = new Map<string, { tokens: number; generations: number }>();

  details.forEach(t =>
    t.observations.forEach(o => {
      if (!isGeneration(o)) return;
      const model = modelOf(o) ?? '(unknown)';
      const e = m.get(model) ?? { tokens: 0, generations: 0 };

      e.tokens += tokensOf(o) ?? 0;
      e.generations++;
      m.set(model, e);
    }),
  );

  return Array.from(m.entries())
    .map(([model, e]) => ({ model, ...e }))
    .sort((a, b) => b.tokens - a.tokens || b.generations - a.generations);
};

export interface ScoresRow { name: string; count: number; avg: number; zeros: number; ones: number }

export const scoresTable = (details: TraceDetail[]): ScoresRow[] => {
  const m = new Map<string, { count: number; sum: number; zeros: number; ones: number }>();

  details.forEach(t =>
    t.scores.forEach(sc => {
      const e = m.get(sc.name) ?? { count: 0, sum: 0, zeros: 0, ones: 0 };

      e.count++;
      e.sum += sc.value;
      if (sc.value === 0) e.zeros++;
      if (sc.value === 1) e.ones++;
      m.set(sc.name, e);
    }),
  );

  return Array.from(m.entries())
    .map(([name, e]) => ({ name, count: e.count, avg: e.count ? e.sum / e.count : 0, zeros: e.zeros, ones: e.ones }))
    .sort((a, b) => b.count - a.count);
};

export interface TimeBucket { time: number; count: number; level: string }

/** Bucket observations by `bucketMs` (default 1h) and observation level for a line chart. */
export const observationsByTime = (details: TraceDetail[], bucketMs = 3600000): TimeBucket[] => {
  const m = new Map<string, number>();

  details.forEach(t =>
    t.observations.forEach(o => {
      const ts = Date.parse(o.startTime);

      if (Number.isNaN(ts)) return;
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      const level = (o.level || 'DEFAULT').toUpperCase();
      const k = `${bucket}|${level}`;

      m.set(k, (m.get(k) ?? 0) + 1);
    }),
  );

  return Array.from(m.entries())
    .map(([k, count]) => {
      const [bucketStr, level] = k.split('|');

      return { time: Number(bucketStr), count, level };
    })
    .sort((a, b) => a.time - b.time);
};

export interface LatencyPercentiles { name: string; count: number; p50: number; p90: number; p95: number; p99: number }

export const latencyByTraceName = (details: TraceDetail[]): LatencyPercentiles[] => {
  const m = new Map<string, number[]>();

  details.forEach(t => {
    const k = t.name || '(unnamed)';
    const arr = m.get(k) ?? [];

    arr.push(traceDurationMs(t));
    m.set(k, arr);
  });

  return Array.from(m.entries())
    .map(([name, arr]) => {
      const sorted = [...arr].sort((a, b) => a - b);

      return {
        name,
        count: sorted.length,
        p50: quantile(sorted, 0.5),
        p90: quantile(sorted, 0.9),
        p95: quantile(sorted, 0.95),
        p99: quantile(sorted, 0.99),
      };
    })
    .sort((a, b) => b.p95 - a.p95);
};
