export type DatasetItemStatus = 'ACTIVE' | 'ARCHIVED';

export interface Dataset {
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  itemCount: number | null;
}

/** One test case. `input` and `expectedOutput` are free-form JSON. */
export interface DatasetItem {
  id: string;
  input: unknown;
  expectedOutput: unknown;
  metadata: Record<string, unknown>;
  sourceTraceId: string | null;
  sourceObservationId: string | null;
  status: DatasetItemStatus;
  createdAt: string;
  updatedAt: string;
}

/** A named run over the dataset; the SDK writes one per experiment variant. */
export interface DatasetRun {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DatasetDetail {
  dataset: Dataset;
  items: DatasetItem[];
  runs: DatasetRun[];
}

export interface DatasetItemRequest {
  /** Case id as the SDK names it (`input.id`). Gives the item the same id `upload_dataset` would. */
  caseId?: string;
  input: unknown;
  expectedOutput: unknown;
  metadata?: Record<string, unknown>;
  sourceTraceId?: string;
  sourceObservationId?: string;
  status?: DatasetItemStatus;
}

/** The SDK stores the case id inside the input; items added by hand may not have one. */
export const caseIdOf = (item: DatasetItem): string | null => {
  const id = (item.input as Record<string, unknown> | null)?.id;

  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
};
