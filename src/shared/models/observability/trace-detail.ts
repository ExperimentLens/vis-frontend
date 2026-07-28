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
    metadata: { [key: string]: any };
    tags: string[];
    isPublic: boolean;
    observations: Observation[];
    scores: Score[];
    input: any;
    output: any;
    latency: number;
    totalCost: number;
}
