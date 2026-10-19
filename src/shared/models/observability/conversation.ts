export interface ConversationTurn {
  index: number;
  user: string | null;
  assistant: string | null;
  traceId: string;
  /** The turn's span; null when each turn is its own trace. */
  observationId: string | null;
}

export interface ConversationMetricInfo {
  name: string;
  description: string;
  needsRole: boolean;
  threshold: number;
}

/** Latest conversation-level result: score 0..1, higher is better. */
export interface ConversationMetricResult {
  metric: string;
  score: number | null;
  passed: boolean | null;
  threshold: number | null;
  reason: string | null;
}

export interface Conversation {
  sessionId: string;
  experimentId: string | null;
  traceId: string | null;
  /** "turn-spans" (SDK ctx.turn), "traces" (one trace per turn) or "none". */
  source: 'turn-spans' | 'traces' | 'none';
  suggestedRole: string | null;
  turns: ConversationTurn[];
  results: ConversationMetricResult[];
  metrics: ConversationMetricInfo[];
}

export interface EvaluateConversationResponse {
  model: string;
  results: ConversationMetricResult[];
  failed: string[];
  savedToRun: boolean;
}

/** "knowledge_retention" -> "Knowledge retention". */
export const metricLabel = (name: string) => {
  const words = name.replace(/_/g, ' ');

  return words.charAt(0).toUpperCase() + words.slice(1);
};
