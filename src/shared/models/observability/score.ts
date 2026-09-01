export interface Score {
    id: string;
    traceId: string;
    name: string;
    // Nullable: a CATEGORICAL score carries its value in stringValue instead.
    value: number | null;
    stringValue?: string | null;
    dataType?: string;
    observationId: string;
    timestamp: string;
    comment: string;
}
