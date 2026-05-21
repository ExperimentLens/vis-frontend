export const AggregationFunction = {
  COUNT: 'COUNT',
  COUNT_ALL: 'COUNT_ALL',
  SUM: 'SUM',
  AVG: 'AVG',
  MIN: 'MIN',
  MAX: 'MAX',
  STDDEV: 'STDDEV',
  VARIANCE: 'VARIANCE',
  MEDIAN: 'MEDIAN',
  PERCENTILE: 'PERCENTILE',
  STRING_AGG: 'STRING_AGG',
  ARRAY_AGG: 'ARRAY_AGG',
  FIRST: 'FIRST',
  LAST: 'LAST',
  MODE: 'MODE',
} as const;

export type AggregationFunction = typeof AggregationFunction[keyof typeof AggregationFunction];

export interface AggregationOptions {
  distinct?: boolean;               // Default: false
  percentileValue?: number;        // For percentile functions (0.0 to 1.0)
  separator?: string;              // For STRING_AGG
  orderBy?: string;                // For ordered aggregations like ARRAY_AGG
  orderDirection?: 'ASC' | 'DESC'; // ASC or DESC, default: "ASC"
}

export interface IAggregation {
  column: string;
  function: AggregationFunction;
  alias?: string;
  options?: AggregationOptions;
}

export interface IDataSource {
  source: string
  format: string
  sourceType: string
  fileName: string
  runId: string
  experimentId: string
  includeSummary?: boolean;     
  includeTotalItems?: boolean;   
  detectDatasetType?: boolean;   

}

export interface IDataExplorationQuery {
  dataSource: IDataSource
  columns?: string[]
  filters?: IFilter[]
  limit?: number
  offset?: number
  groupBy?: string[] // Optional, added
  aggregations?: IAggregation[]
  includeTotalItems?: boolean
}

export interface IDataExplorationRequest {
  query: IDataExplorationQuery
  metadata: {
    workflowId: string
    queryCase: string
    assetName?: string
    columnName?: string
  }
}

export interface IMetaDataQuery{
  source: string
  format: string
  sourceType: string
  fileName: string
  runId: string
  experimentId: string
  includeSummary?: boolean;     
  includeTotalItems?: boolean;  
  detectDatasetType?: boolean;  
  
}
export interface IMetaDataRequest {
  query: IMetaDataQuery
  metadata: {
    workflowId: string
    queryCase: string
    assetName?: string
  }
}

export interface fetchAffectedRequest{
    workflowId: string
    queryCase: string
}

export interface VisualColumn {
  name: string
  type: string
}

// Model for TabularResults
export interface IDataExplorationResponse {
  data: unknown
  totalItems: number
  querySize: number
  columns: VisualColumn[]

}

export interface IMetaDataSummary {
  std?: number
  min?: number
  avg?: number
  max?: number
  q25?: number
  approx_unique?: number
  column_name?: string
  count?: number
  null_percentage?: number
  column_type?: string
  q50?: number
  q75?: number
}
export interface IDataExplorationMetaDataResponse {
  datasetType: string
  fileNames: string[] | string
  originalColumns: VisualColumn[]
  totalItems: number
  uniqueColumnValues: Record<string, unknown[]>
  hasLatLonColumns:boolean
  timeColumn?: string[]
  summary: IMetaDataSummary[]
}

export interface IFilter {
  column: string;
  type: string;
  operator: string;
  value: number | string;
}

// ---------------------------------------------------------------------------
// Aggregate / Downsample / Histogram — server-pushdown endpoints
// ---------------------------------------------------------------------------

export interface IAggregateQuery {
  dataSource: IDataSource;
  groupBy?: string[];
  aggregations?: IAggregation[];
  filters?: IFilter[];
  limit?: number;
}

export interface IAggregateRequest {
  query: IAggregateQuery;
  metadata: {
    workflowId: string;
    queryCase: string;
  };
}

export interface IDownsampleQuery {
  dataSource: IDataSource;
  xColumn: string;
  yColumns: string[];
  filters?: IFilter[];
  buckets?: number;
}

export interface IDownsampleRequest {
  query: IDownsampleQuery;
  metadata: {
    workflowId: string;
    queryCase: string;
  };
}

export interface IDownsampleResponse {
  xColumn: string;
  yColumns: string[];
  buckets: number;
  totalRows: number;
  // Stringified JSON: [{ bucket, x_first, x_last, <y>_min, <y>_max, x_at_<y>_min, x_at_<y>_max, ... }]
  data: unknown;
}

export interface IHistogramQuery {
  dataSource: IDataSource;
  column: string;
  filters?: IFilter[];
  buckets?: number;
}

export interface IHistogramRequest {
  query: IHistogramQuery;
  metadata: {
    workflowId: string;
    queryCase: string;
  };
}

export interface IHistogramResponse {
  column: string;
  min: number;
  max: number;
  buckets: number;
  totalCount: number;
  nullCount: number;
  // Stringified JSON: [{ bucket, bin_lo, bin_hi, count }]
  data: unknown;
}

// Scatter: reservoir sample (raw points, capped) and 2D rectangular bin (density).

export interface IScatterSampleQuery {
  dataSource: IDataSource;
  xColumn: string;
  yColumn: string;
  colorColumn?: string;
  filters?: IFilter[];
  sampleSize?: number;
}

export interface IScatterSampleRequest {
  query: IScatterSampleQuery;
  metadata: {
    workflowId: string;
    queryCase: string;
  };
}

export interface IScatterBinQuery {
  dataSource: IDataSource;
  xColumn: string;
  yColumn: string;
  filters?: IFilter[];
  xBuckets?: number;
  yBuckets?: number;
}

export interface IScatterBinRequest {
  query: IScatterBinQuery;
  metadata: {
    workflowId: string;
    queryCase: string;
  };
}

export interface IScatterBinResponse {
  xColumn: string;
  yColumn: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xBuckets: number;
  yBuckets: number;
  totalCount: number;
  // Stringified JSON: [{ x_bin, y_bin, x_lo, x_hi, y_lo, y_hi, count }]
  data: unknown;
}

export const defaultDataExplorationQuery: IDataExplorationQuery = {
  dataSource: {
    source: '',
    format: '',
    sourceType: '',
    fileName: '',
    runId: 'dataCache',
    experimentId: 'unknown',
    includeSummary: false,
    includeTotalItems: false,
    detectDatasetType: false
  },
  // limit: 0,
  columns: [],
  filters: [],
  offset: 0,
  groupBy: [],
  aggregations: [],
  includeTotalItems: false
};
