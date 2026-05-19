export interface Trace {
    id: string;
    timestamp: string;
    name: string;
    input: any;
    output: any;
    sessionId: string;
    release: string;
    version: string;
    userId: string;
    metadata: { [key: string]: any };
    tags: string[];
    isPublic: boolean;
    environment: string;
    observations: string[];
    scores: string[];
}
