export interface Observation {
    id: string;
    traceId: string;
    type: string;
    name: string;
    startTime: string;
    endTime: string;
    model: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    level: string;
    statusMessage: string;
    parentObservationId: string;
    version: number;
}
