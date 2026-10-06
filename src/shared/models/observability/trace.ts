export interface Trace {
    id: string;
    timestamp: string;
    name: string;
    input: unknown;
    output: unknown;
    sessionId: string;
    release: string;
    version: string;
    userId: string;
    metadata: Record<string, unknown>;
    tags: string[];
    isPublic: boolean;
    environment: string;
    observations: string[];
    scores: string[];
}
