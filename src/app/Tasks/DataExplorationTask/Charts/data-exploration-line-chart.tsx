import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useEffect } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import LineChartControlPanel from '../ChartControls/data-exploration-line-control';
import InfoMessage from '../../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { fetchDataExplorationData, fetchDownsampleData } from '../../../../store/slices/dataExplorationSlice';

// Below this row count we fetch raw rows; above it we ask the server to
// M4-downsample so the chart stays smooth without truncating peaks.
const DOWNSAMPLE_THRESHOLD = 5000;
// Target bucket count; M4 emits up to 4 points per bucket per y column.
const DOWNSAMPLE_BUCKETS = 500;
import type { VisualColumn } from '../../../../shared/models/dataexploration.model';
import { vegaScaleOrUndefined } from '../../../../shared/utils/chartColorScales';

// TODO: stacked mode change to one box with name Line chart

const getColumnType = (columnType: string, fieldName?: string) => {
  if (fieldName?.toLowerCase() === 'timestamp') return 'temporal';
  switch (columnType) {
    case 'DOUBLE':
    case 'FLOAT':
    case 'INTEGER':
      return 'quantitative';
    case 'LOCAL_DATE_TIME':
      return 'temporal';
    case 'STRING':
    default:
      return 'ordinal';
  }
};

type LineChartDataRow = Record<string, number | string | Date | null>;

const normalizeNumericString = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();

  if (!s) return null;

  return s.replace(/,/g, '').replace(/%$/, '');
};

const isNumericLikeValue = (v: unknown): boolean => {
  const n = normalizeNumericString(v);

  if (n === null || n === undefined) return false;

  return /^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i.test(n);
};

const isFieldNumericLike = (data: LineChartDataRow[], field: string): boolean => {
  let seen = false;

  for (const row of data) {
    const v = row[field];

    if (v === null || v === undefined || v === '') continue;
    seen = true;
    if (!isNumericLikeValue(v)) return false;
  }

  return seen;
};

const coerceIfNumericLike = (v: unknown): unknown => {
  if (!isNumericLikeValue(v)) return v;
  const n = normalizeNumericString(v)!;
  const parsed = Number(n);

  return Number.isFinite(parsed) ? parsed : v;
};

const getLineQueryLimit = (isSmallScreen: boolean, yAxisCount: number): number => {
  const base = isSmallScreen ? 8000 : 14000;
  const penaltyPerMetric = isSmallScreen ? 1200 : 1800;
  const minLimit = isSmallScreen ? 4000 : 7000;
  const computed = base - Math.max(0, yAxisCount - 1) * penaltyPerMetric;

  return Math.max(minLimit, computed);
};

const LineChart = () => {
  const { tab } = useAppSelector(state => state.workflowPage);
  const experimentId = useAppSelector(state => state.progressPage?.experiment.data?.id || '');

  const meta = tab?.workflowTasks.dataExploration?.metaData;
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));
  const dispatch = useAppDispatch();

  useEffect(() => {
    const xAxis = tab?.workflowTasks.dataExploration?.controlPanel.xAxis;
    const yAxis = tab?.workflowTasks.dataExploration?.controlPanel.yAxis;
    const filters = tab?.workflowTasks.dataExploration?.controlPanel.filters;
    const datasetId = tab?.dataTaskTable.selectedItem?.data?.dataset?.source || '';
    const dataset = tab?.dataTaskTable.selectedItem?.data?.dataset;
    const yAxisCount = Array.isArray(yAxis) ? yAxis.length : 0;
    const queryLimit = getLineQueryLimit(isSmallScreen, yAxisCount);
    const totalItems = meta?.data?.totalItems ?? 0;

    const cols = Array.from(
      new Set(
        [
          xAxis && xAxis.name,
          ...(Array.isArray(yAxis) ? yAxis.map(axis => axis && axis.name) : []),
        ].filter((col): col is string => typeof col === 'string')
      )
    );

    if (!datasetId || !xAxis || !yAxis?.length || meta?.source !== tab?.dataTaskTable.selectedItem?.data?.dataset?.source) return;

    const dataSource = {
      source: datasetId,
      format: dataset?.format || '',
      sourceType: dataset?.sourceType || '',
      fileName: dataset?.name || '',
      runId: tab?.workflowId || '',
      experimentId: experimentId || '',
    };

    // For large datasets, ask the server to M4-downsample. Works for multi-Y too:
    // the expander emits one row per (bucket, y) with that y populated, and the
    // chart render skips longData entries where the y value is undefined.
    if (totalItems > DOWNSAMPLE_THRESHOLD) {
      dispatch(
        fetchDownsampleData({
          query: {
            dataSource,
            xColumn: xAxis.name,
            yColumns: yAxis.map(y => y.name),
            filters,
            buckets: DOWNSAMPLE_BUCKETS,
          },
          metadata: {
            workflowId: tab?.workflowId || '',
            queryCase: 'lineChart',
          },
        })
      );
      return;
    }

    dispatch(
      fetchDataExplorationData({
        query: {
          dataSource,
          columns: cols,
          filters,
          limit: queryLimit,
          includeTotalItems: false,
        },
        metadata: {
          workflowId: tab?.workflowId || '',
          queryCase: 'lineChart',
        },
      })
    );
  }, [
    tab?.workflowTasks.dataExploration?.controlPanel.xAxis,
    tab?.workflowTasks.dataExploration?.controlPanel.yAxis,
    tab?.workflowTasks.dataExploration?.controlPanel.filters,
    tab?.dataTaskTable.selectedItem?.data?.dataset?.source,
    tab?.workflowId,
    isSmallScreen,
    meta?.data?.totalItems,
  ]);

  const chartData = (tab?.workflowTasks.dataExploration?.lineChart?.data?.data as LineChartDataRow[]) ?? [];
  const xAxis = tab?.workflowTasks.dataExploration?.controlPanel?.xAxis;
  const yAxis = tab?.workflowTasks.dataExploration?.controlPanel?.yAxis;
  const displayMode = tab?.workflowTasks.dataExploration?.controlPanel?.viewMode || 'overlay';

  // build color scale
  const colorScale =
  vegaScaleOrUndefined(
    yAxis?.map(y => y.name),
    theme
  );

  const getLineChartSpec = ({
    data,
    xAxis,
    yAxis,
  }: {
    data: LineChartDataRow[]
    xAxis: VisualColumn
    yAxis: VisualColumn[]
  }) => {
    const xField = xAxis.name;

    // Decide X type: respect meta unless values are numeric-like (and not temporal)
    const xMetaType = getColumnType(xAxis.type, xAxis.name);
    const xIsNumericLike = xMetaType !== 'temporal' && isFieldNumericLike(data, xField);
    const xTypeForEncoding: 'quantitative' | 'temporal' | 'ordinal' =
      (xIsNumericLike ? 'quantitative' : xMetaType);

    // Build long data and coerce numeric-like for X and each Y.
    // Skip rows where this Y value is missing — happens after M4 downsampling
    // where each emitted row only populates one of the multiple Y columns.
    const longData: LineChartDataRow[] = [];

    data.forEach(row => {
      const xVal = xIsNumericLike ? coerceIfNumericLike(row[xField]) : row[xField];

      yAxis.forEach(y => {
        const raw = row[y.name];
        if (raw === undefined || raw === null) return;

        const yMetaType = getColumnType(y.type, y.name);
        const yIsNumericLike = yMetaType !== 'temporal' && isNumericLikeValue(raw);

        longData.push({
          [xField]: xVal,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: yIsNumericLike ? coerceIfNumericLike(raw) as number : (raw as any),
          variable: y.name,
        });
      });
    });

    return {
      data: { values: longData },
      params: [
        {
          name: 'panZoom',
          select: 'interval',
          bind: 'scales',
          clear: 'dblclick',
        },
      ],
      mark: { type: 'line', tooltip: true, point: { size: 20 } },
      encoding: {
        x: {
          field: xField,
          type: xTypeForEncoding,
          axis: {
            labelAngle: xTypeForEncoding === 'ordinal' ? -45 : 0,
            labelColor: '#333',
            titleColor: '#444',
            labelOverlap: xTypeForEncoding === 'ordinal' ? 'greedy' : undefined,
          },
        },
        y: {
          field: 'value',
          type: 'quantitative',
          title: 'Value',
        },
        color: {
          field: 'variable',
          type: 'nominal',
          title: 'Metric',
          scale: colorScale,
          legend: {
            orient: 'top',
            direction: 'horizontal',
          },
        },
      },
    };
  };

  const getSingleLineSpec = ({
    data,
    xAxis,
    y,
  }: {
    data: LineChartDataRow[]
    xAxis: VisualColumn
    y: VisualColumn
  }) => {
    const xField = xAxis.name;
    const yField = y.name;

    const xMetaType = getColumnType(xAxis.type, xAxis.name);
    const yMetaType = getColumnType(y.type, y.name);

    const xIsNumericLike = xMetaType !== 'temporal' && isFieldNumericLike(data, xField);
    const yIsNumericLike = yMetaType !== 'temporal' && isFieldNumericLike(data, yField);

    const xTypeForEncoding: 'quantitative' | 'temporal' | 'ordinal' =
      (xIsNumericLike ? 'quantitative' : xMetaType);
    const yTypeForEncoding: 'quantitative' | 'temporal' | 'ordinal' =
      (yIsNumericLike ? 'quantitative' : yMetaType);

    // Filter rows where this Y is missing (multi-Y M4 emits one Y per row),
    // then coerce values where needed.
    const values = cloneDeep(data)
      .filter(row => row[yField] !== undefined && row[yField] !== null)
      .map(row => {
        const copy = { ...row };

        if (xIsNumericLike) copy[xField] = coerceIfNumericLike(copy[xField]) as number;
        if (yIsNumericLike) copy[yField] = coerceIfNumericLike(copy[yField]) as number;

        return copy;
      });

    // needed in order to have color encoding even for single line
    const valuesWithColumn = values.map(row => ({ ...row, column: yField }));
    const colorScale = vegaScaleOrUndefined(
      (tab?.workflowTasks.dataExploration?.controlPanel?.yAxis || []).map(c => c.name),
      theme
    );

    return {
      data: { values: valuesWithColumn },
      params: [
        {
          name: 'panZoom',
          select: 'interval',
          bind: 'scales',
          clear: 'dblclick',
        },
      ],
      mark: { type: 'line', tooltip: true, point: { size: 20 } },
      encoding: {
        x: {
          field: xField,
          type: xTypeForEncoding,
          axis: {
            labelAngle: xTypeForEncoding === 'ordinal' ? -45 : 0,
            labelColor: '#333',
            titleColor: '#444',
            labelOverlap: xTypeForEncoding === 'ordinal' ? 'greedy' : undefined,
          },
        },
        y: {
          field: yField,
          type: yTypeForEncoding,
          axis: {
            labelAngle: yTypeForEncoding === 'ordinal' ? -45 : 0,
            labelColor: '#333',
            titleColor: '#444',
            labelOverlap: yTypeForEncoding === 'ordinal' ? 'greedy' : undefined,
          },
        },
        color: {
          field: 'column',
          type: 'nominal',
          legend: null,
          scale: colorScale
        },
      },
    };
  };

  const hasData = Array.isArray(chartData) && chartData.length > 0;

  const hasValidXAxis = xAxis && xAxis.name;
  const hasValidYAxis = Array.isArray(yAxis) && yAxis.length > 0;

  let infoMessageText = '';

  if (!hasValidXAxis || !hasValidYAxis) {
    infoMessageText = 'Please select x-Axis and y-Axis to display the chart.';
  } else if (!hasData) {
    infoMessageText = 'No data available for the selected configuration.';
  }

  const info = (
    <InfoMessage
      message={infoMessageText}
      type="info"
      icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
      fullHeight
    />
  );

  const shouldShowInfoMessage = !hasValidXAxis || !hasValidYAxis || !hasData;

  const getStackedLineSpec = ({
    data,
    xAxis,
    yAxis,
  }: {
    data: LineChartDataRow[];
    xAxis: VisualColumn;
    yAxis: VisualColumn[];
  }) => {
    const charts = (yAxis ?? [])
      .filter((y): y is VisualColumn => Boolean(y?.name))
      .map((y) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const single = getSingleLineSpec({ data, xAxis, y }) as any;

        return {
          ...single,
          height: 200
        };
      });

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      vconcat: charts,
      spacing: 12,
      resolve: {
        scale: { y: 'independent' },
      },
    };
  };

  return (
    <Box sx={{ height: '99%' }}>
      {shouldShowInfoMessage && !(
        tab?.workflowTasks.dataExploration?.lineChart?.loading || tab?.workflowTasks.dataExploration?.metaData?.loading
      ) ? (
          <ResponsiveCardVegaLite
            spec={{}}
            title="Line Chart"
            actions={false}
            controlPanel={<LineChartControlPanel />}
            infoMessage={info}
            showInfoMessage={true}
            maxHeight={isSmallScreen ? undefined : 500}
            aspectRatio={isSmallScreen ? 2.8 : 1.8}
          />
        ) : displayMode === 'overlay' ? (
          <ResponsiveCardVegaLite
            spec={getLineChartSpec({
              data: Array.isArray(chartData) ? chartData : [],
              xAxis: xAxis as VisualColumn,
              yAxis: yAxis as VisualColumn[],
            })}
            title="Line Chart"
            actions={false}
            controlPanel={<LineChartControlPanel />}
            maxHeight={500}
            aspectRatio={isSmallScreen ? 2.8 : 1.8}
            loading={tab?.workflowTasks.dataExploration?.lineChart?.loading || tab?.workflowTasks.dataExploration?.metaData?.loading}
          />
        ) : (
          <ResponsiveCardVegaLite
            spec={getStackedLineSpec({
              data: Array.isArray(chartData) ? chartData : [],
              xAxis: xAxis as VisualColumn,
              yAxis: yAxis as VisualColumn[],
            })}
            title="Line Chart"
            actions={false}
            controlPanel={<LineChartControlPanel />}
            maxHeight={5000}
            loading={
              tab?.workflowTasks.dataExploration?.lineChart?.loading ||
              tab?.workflowTasks.dataExploration?.metaData?.loading
            }
            isStatic={false}
          />
        )}
    </Box>
  );
};

export default LineChart;
