import type { Observation } from './observation';
import type { Score } from './score';

export interface TraceDetail {
    id: string;
    timestamp: string;
    name: string;
    userId: string;
    sessionId: string;
    release: string;
    version: string;
    metadata: Record<string, unknown>;
    tags: string[];
    isPublic: boolean;
    observations: Observation[];
    scores: Score[];
    input: unknown;
    output: unknown;
    latency: number;
    totalCost: number;
}
