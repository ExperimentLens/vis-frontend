export interface Observation {
    id: string;
    traceId: string;
    type: string;
    name: string;
    startTime: string;
    endTime: string;
    model: string;
    input: { [key: string]: any };
    output: { [key: string]: any };
    level: string;
    statusMessage: string;
    parentObservationId: string;
    version: number;
}
