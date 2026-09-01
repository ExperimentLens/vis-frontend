export interface ScoreCreateRequest {
    traceId: string;
    observationId?: string | null;
    name: string;
    dataType: 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN';
    value?: number;
    stringValue?: string;
    comment?: string;
}
