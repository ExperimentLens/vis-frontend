export const CLEARS_CATEGORIES = ['Correctness', 'Latency', 'Execution', 'Adherence', 'Relevance', 'Safety'] as const;
export type ClearsCategory = typeof CLEARS_CATEGORIES[number];

export interface IssueScanTraceInput {
    traceId: string;
    question: string;
    answer: string;
}

export interface IssueScanRequest {
    traces: IssueScanTraceInput[];
    categories: string[];
    model: string;
}

export interface DetectedIssue {
    traceId: string;
    category: string | null;
    severity: 'low' | 'medium' | 'high' | null;
    explanation: string | null;
}

export interface IssueScanResponse {
    issues: DetectedIssue[];
    failedTraceIds: string[];
    scannedCount: number;
}
