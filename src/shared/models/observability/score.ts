export interface Score {
    id: string;
    traceId: string;
    // Nullable: some scores (typically system/automated ones) come back from
    // Langfuse with no name set at all, not just a non-human_-prefixed one.
    name: string | null;
    // Nullable: a CATEGORICAL score carries its value in stringValue instead.
    value: number | null;
    stringValue?: string | null;
    dataType?: string;
    observationId: string;
    timestamp: string;
    comment: string;
}
