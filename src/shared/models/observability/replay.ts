export interface ReplayRequest {
    observationId: string;
    overrides: Record<string, unknown>;
}

export interface ReplayResult {
    traceId: string;
    observationId: string;
    originalInput: unknown;
    newInput: unknown;
    originalOutput: unknown;
    newOutput: unknown;
    diffRatio: number;
    createdAt: string;
}
