import type {
  ActionReducerMapBuilder,
} from '@reduxjs/toolkit';
import {
  createAsyncThunk,
} from '@reduxjs/toolkit';
import { type IWorkflowPage } from './workflowPageSlice';
import {
  AggregationFunction,
  type IAggregateRequest,
  type IDataExplorationMetaDataResponse,
  type IDataExplorationRequest,
  type IDataExplorationResponse,
  type IDownsampleRequest,
  type IDownsampleResponse,
  type IHistogramRequest,
  type IHistogramResponse,
  type IMetaDataRequest,
  type IScatterBinRequest,
  type IScatterBinResponse,
  type IScatterSampleRequest,
  type VisualColumn,
} from '../../shared/models/dataexploration.model';
import type { IDataExploration } from '../../shared/models/tasks/data-exploration-task.model';
import { handleMultiTimeSeriesData, prepareDataExplorationResponse } from '../../shared/models/tasks/model-analysis.model';
import { api } from '../../app/api/api';

// Only keys that contain { data, loading, error }
type AsyncQueryKey = Exclude<keyof IDataExploration, 'controlPanel' | 'umap'>;

function getAsyncState<T extends AsyncQueryKey>(task: IDataExploration, key: T) {
  return task[key];
}

// Expands an M4 downsample response into the flat point list the existing line
// chart already knows how to render. Each bucket emits up to 4 points per y
// column (first, min, max, last). Rows are sorted by x so the line draws cleanly.
// `data` ends up as already-parsed JSON (the line chart accesses it as an array).
function expandM4Response(
  payload: IDownsampleResponse,
  xColumn: string,
  yColumns: string[],
): IDataExplorationResponse {
  const safeIdent = (n: string) => n.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
  type Bucket = Record<string, unknown>;
  const rawBuckets: Bucket[] = (Array.isArray(payload.data)
    ? payload.data
    : (typeof payload.data === 'string' ? JSON.parse(payload.data) : [])) as Bucket[];

  type Point = Record<string, unknown>;
  const points: Point[] = [];

  for (const b of rawBuckets) {
    for (const y of yColumns) {
      const safe = safeIdent(y);
      const yMin = b[`${safe}_min`];
      const yMax = b[`${safe}_max`];
      const yFirst = b[`${safe}_first`];
      const yLast = b[`${safe}_last`];
      const xAtMin = b[`x_at_${safe}_min`];
      const xAtMax = b[`x_at_${safe}_max`];

      if (yFirst !== undefined && yFirst !== null) {
        points.push({ [xColumn]: b.x_first, [y]: yFirst });
      }
      if (xAtMin !== undefined && yMin !== undefined && yMin !== null) {
        points.push({ [xColumn]: xAtMin, [y]: yMin });
      }
      if (xAtMax !== undefined && yMax !== undefined && yMax !== null) {
        points.push({ [xColumn]: xAtMax, [y]: yMax });
      }
      if (yLast !== undefined && yLast !== null) {
        points.push({ [xColumn]: b.x_last, [y]: yLast });
      }
    }
  }

  // Sort by x so the line draws left-to-right.
  points.sort((a, b) => {
    const ax = a[xColumn] as number | string;
    const bx = b[xColumn] as number | string;
    if (typeof ax === 'number' && typeof bx === 'number') return ax - bx;
    return String(ax).localeCompare(String(bx));
  });

  return {
    data: points,
    columns: [
      { name: xColumn, type: 'DOUBLE' },
      ...yColumns.map(y => ({ name: y, type: 'DOUBLE' })),
    ],
    totalItems: payload.totalRows,
    querySize: points.length,
  };
}

export const dataExplorationReducers = (
  builder: ActionReducerMapBuilder<IWorkflowPage>,
) => {
  builder
    .addCase(fetchDataExplorationData.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);

        asyncState.data = queryCase === 'multipleTimeSeries'
          ? handleMultiTimeSeriesData(action.payload)
          : prepareDataExplorationResponse(action.payload);
        asyncState.loading = false;
        asyncState.error = null;

        if (queryCase === 'dataTable') {
          const totalItems = state.tab?.workflowTasks.dataExploration?.dataTable.data?.totalItems || 0;
          const { pageSize } = task.controlPanel;

          task.controlPanel.queryItems = totalItems;
          task.controlPanel.totalPages = Math.ceil(totalItems / pageSize);
        }
      }
    })
    .addCase(fetchDataExplorationData.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = true;
        getAsyncState(task, queryCase).error = null;
      }
    })
    .addCase(fetchDataExplorationData.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);

        asyncState.loading = false;
        asyncState.error = 'Failed to fetch data';
      }
    })
    .addCase(fetchMetaData.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;

      if (!task) return;

      const { originalColumns } = action.payload;

      task.metaData.data = action.payload;
      task.metaData.loading = false;
      task.metaData.error = null;

      task.metaData.source = action.meta.arg.query?.source ?? null;

      task.controlPanel.selectedColumns = originalColumns?.slice(0, 5) ?? [];

      if (originalColumns[0]) {
        task.controlPanel.xAxis = originalColumns[0];
        task.controlPanel.xAxisScatter = originalColumns[0];
        task.controlPanel.colorBy = originalColumns[0];
      }

      const isNumericType = (t: VisualColumn['type']) =>
        t === 'INTEGER' || t === 'DOUBLE' || t === 'FLOAT' || t === 'BIGINT';

      const xAxisCol = task.controlPanel.xAxis ?? null;
      const numericColumns = originalColumns.filter((c: VisualColumn) => isNumericType(c.type));

      let yAxisCol = numericColumns.find(column => column.name !== xAxisCol?.name) ?? null;

      if (!yAxisCol) yAxisCol = numericColumns[0] ?? null;

      task.controlPanel.yAxis = yAxisCol ? [yAxisCol] : [];

      const defaultYAxis = originalColumns.length > 1
        ? [originalColumns[1]]
        : [originalColumns[0]].filter(Boolean);

      // yAxisScatter is not used anymore
      task.controlPanel.yAxisScatter = defaultYAxis;
      task.controlPanel.timestampField = task.metaData.data?.timeColumn || null;
      task.controlPanel.orderBy =  null;
      const stringCols = originalColumns.filter((col: VisualColumn) => col.type === 'STRING');
      const numericColumn = numericColumns[0] ?? null;

      if (stringCols[0]) task.controlPanel.barGroupBy = [stringCols[0].name];

      if (numericColumn) {
        task.controlPanel.barAggregation.push({
          column: numericColumn.name,
          function: AggregationFunction.COUNT
        });
        task.controlPanel.selectedMeasureColumn = numericColumn.name;
      }

      const heatmapGroupBy = stringCols.slice(0, 2).map(col => col.name);

      if (heatmapGroupBy.length === 2) {
        task.controlPanel.barGroupByHeat = heatmapGroupBy;
      }

      if (numericColumn) {
        task.controlPanel.barAggregationHeat.push({
          column: numericColumn.name,
          function: AggregationFunction.COUNT
        });
        task.controlPanel.selectedMeasureColumnHeat = numericColumn.name;
      }
    })
    .addCase(fetchMetaData.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;

      if (task) {
        task.metaData.loading = true;
        task.metaData.error = null;
        task.metaData.source = action.meta.arg.query?.source ?? null;
      }
    })
    .addCase(fetchMetaData.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;

      if (task) {
        task.metaData.loading = false;
        task.metaData.error = 'Failed to fetch metadata';
        task.metaData.source = action.meta.arg.query?.source ?? null;
      }
    })
    // ---- Aggregate (same shape as fetchDataExplorationData) ----
    .addCase(fetchAggregateData.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);

        asyncState.data = prepareDataExplorationResponse(action.payload);
        asyncState.loading = false;
        asyncState.error = null;
      }
    })
    .addCase(fetchAggregateData.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = true;
        getAsyncState(task, queryCase).error = null;
      }
    })
    .addCase(fetchAggregateData.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);

        asyncState.loading = false;
        asyncState.error = 'Failed to fetch aggregated data';
      }
    })
    // ---- Downsample: expand M4 buckets into flat points so the line chart renders unchanged ----
    .addCase(fetchDownsampleData.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);
        const { xColumn, yColumns } = action.meta.arg.query;
        const expanded = expandM4Response(action.payload, xColumn, yColumns);

        asyncState.data = expanded;
        asyncState.loading = false;
        asyncState.error = null;
      }
    })
    .addCase(fetchDownsampleData.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = true;
        getAsyncState(task, queryCase).error = null;
      }
    })
    .addCase(fetchDownsampleData.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);

        asyncState.loading = false;
        asyncState.error = 'Failed to downsample time series';
      }
    })
    // ---- Scatter sample (same shape as fetchDataExplorationData) ----
    .addCase(fetchScatterSample.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);

        asyncState.data = prepareDataExplorationResponse(action.payload);
        asyncState.loading = false;
        asyncState.error = null;
      }
    })
    .addCase(fetchScatterSample.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = true;
        getAsyncState(task, queryCase).error = null;
      }
    })
    .addCase(fetchScatterSample.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = false;
        getAsyncState(task, queryCase).error = 'Failed to sample scatter data';
      }
    })
    // ---- Scatter bin: parse the bin payload and shape it as a fake DataExplorationResponse
    // so it can live in the same scatterChart slot. The chart detects the bin columns
    // (x_lo/x_hi/y_lo/y_hi/count) and switches to a heatmap rendering. ----
    .addCase(fetchScatterBin.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        const asyncState = getAsyncState(task, queryCase);
        const bins = typeof action.payload.data === 'string'
          ? JSON.parse(action.payload.data)
          : action.payload.data;

        asyncState.data = {
          // Marker columns so the chart can detect this is a bin response.
          columns: [
            { name: 'x_bin', type: 'INTEGER' },
            { name: 'y_bin', type: 'INTEGER' },
            { name: 'x_lo', type: 'DOUBLE' },
            { name: 'x_hi', type: 'DOUBLE' },
            { name: 'y_lo', type: 'DOUBLE' },
            { name: 'y_hi', type: 'DOUBLE' },
            { name: 'count', type: 'BIGINT' },
          ],
          data: bins,
          totalItems: action.payload.totalCount,
          querySize: Array.isArray(bins) ? bins.length : 0,
        };
        asyncState.loading = false;
        asyncState.error = null;
      }
    })
    .addCase(fetchScatterBin.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = true;
        getAsyncState(task, queryCase).error = null;
      }
    })
    .addCase(fetchScatterBin.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;
      const queryCase = action.meta.arg.metadata.queryCase as AsyncQueryKey;

      if (task) {
        getAsyncState(task, queryCase).loading = false;
        getAsyncState(task, queryCase).error = 'Failed to bin scatter data';
      }
    })
    .addCase(fetchUmap.fulfilled, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;

      if (task) {
        task.umap.data = action.payload;
        task.umap.loading = false;
        task.umap.error = null;
      }
    })
    .addCase(fetchUmap.pending, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;

      if (task) {
        task.umap.loading = true;
        task.umap.error = null;
      }
    })
    .addCase(fetchUmap.rejected, (state, action) => {
      const task = state.tab?.workflowId === action.meta.arg.metadata.workflowId
        ? state.tab?.workflowTasks.dataExploration
        : null;

      if (task) {
        task.umap.loading = false;
        task.umap.error = 'Failed to fetch umap';
      }
    });
};

export const fetchDataExplorationData = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_data',
  async (payload: IDataExplorationRequest) => {
    const requestUrl = 'data/fetch';

    return api
      .post<IDataExplorationResponse>(requestUrl, payload.query)
      .then(response => response.data);
  },
);

export const fetchMetaData = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_metadata',
  async (payload: IMetaDataRequest) => {
    const requestUrl = 'data/meta';

    return api
      .post<IDataExplorationMetaDataResponse>(requestUrl, payload.query)
      .then(response => response.data);
  },
);

// Server-side GROUP BY aggregation. Result is bounded by groupBy cardinality,
// so bar/heatmap charts no longer need an artificial 10k row cap.
export const fetchAggregateData = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_aggregate',
  async (payload: IAggregateRequest) => {
    return api
      .post<IDataExplorationResponse>('data/aggregate', payload.query)
      .then(response => response.data);
  },
);

// M4 time-series downsampling. Response is ~buckets rows regardless of source size.
export const fetchDownsampleData = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_downsample',
  async (payload: IDownsampleRequest) => {
    return api
      .post<IDownsampleResponse>('data/timeseries/downsample', payload.query)
      .then(response => response.data);
  },
);

// Equi-width histogram. Response is bounded by buckets (default 30).
export const fetchHistogramData = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_histogram',
  async (payload: IHistogramRequest) => {
    return api
      .post<IHistogramResponse>('data/histogram', payload.query)
      .then(response => response.data);
  },
);

// Reservoir-sampled scatter points (capped raw rows). Response is same shape as
// /fetch, so it flows through the existing reducer for scatterChart unchanged.
export const fetchScatterSample = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_scatter_sample',
  async (payload: IScatterSampleRequest) => {
    return api
      .post<IDataExplorationResponse>('data/scatter/sample', payload.query)
      .then(response => response.data);
  },
);

// 2D rectangular density binning for very large scatter sources.
export const fetchScatterBin = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_scatter_bin',
  async (payload: IScatterBinRequest) => {
    return api
      .post<IScatterBinResponse>('data/scatter/bin', payload.query)
      .then(response => response.data);
  },
);

export const fetchUmap = createAsyncThunk(
  'workflowTasks/data_exploration/fetch_umap',
  async (payload: { data: number[][]; metadata: {workflowId: string; query: string;} }) => {
    const requestUrl = 'data/umap';

    return api
      .post<number[][]>(requestUrl, payload.data)
      .then(response => response.data);
  },
);
