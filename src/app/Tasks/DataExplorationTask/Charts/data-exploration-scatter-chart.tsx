import { Box, useTheme, useMediaQuery, Grid } from '@mui/material';
import { useEffect } from 'react';
import { cloneDeep } from 'lodash';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ScatterChartControlPanel from '../ChartControls/data-exploration-scatter-control';
import Uchart from './data-exploration-u-chart';
import type { VisualColumn } from '../../../../shared/models/dataexploration.model';
import { fetchDataExplorationData } from '../../../../store/slices/dataExplorationSlice';

type ScatterChartDataRow = Record<string, number | string | Date | null>;

interface CalculateTransform {
  calculate: string;
  as: string | undefined;
}

const normalizeNumericString = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();

  if (!s) return null;

  return s.replace(/,/g, '').replace(/%$/, '');
};

const isNumericLikeValue = (v: unknown): boolean => {
  const n = normalizeNumericString(v);

  if (n == null) return false;

  return /^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i.test(n);
};

const isFieldNumericLike = (data: ScatterChartDataRow[], field: string): boolean => {
  let seen = false;

  for (const row of data) {
    const v = row[field];

    if (v == null || v === '') continue;
    seen = true;
    if (!isNumericLikeValue(v)) return false;
  }

  return seen;
};

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
      return 'nominal';
  }
};

const getSingleScatterSpec = ({
  data,
  xAxis,
  y,
  colorBy,
}: {
  data: ScatterChartDataRow[]
  xAxis: VisualColumn
  y: VisualColumn
  colorBy?: VisualColumn
}) => {
  const colorField = colorBy?.name;
  const colorTypeFromMeta = colorBy ? getColumnType(colorBy.type, colorBy.name) : undefined;
  const colorIsNumericLike = !!(colorField && isFieldNumericLike(data, colorField));
  const colorFieldForEncoding = colorField;

  const xMetaType = getColumnType(xAxis.type, xAxis.name);
  const xIsNumericLike = isFieldNumericLike(data, xAxis.name);
  const xTypeForEncoding: 'quantitative' | 'temporal' | 'nominal' =
    xIsNumericLike ? 'quantitative' : xMetaType;

  const yMetaType = getColumnType(y.type, y.name);
  const yIsNumericLike = isFieldNumericLike(data, y.name);
  const yTypeForEncoding: 'quantitative' | 'temporal' | 'nominal' =
    yIsNumericLike ? 'quantitative' : yMetaType;

  const transforms: CalculateTransform[] = [];

  if (colorIsNumericLike) {
    transforms.push({
      calculate: `toNumber(replace(replace(datum["${colorField}"], ",", ""), "%", ""))`,
      as: colorFieldForEncoding,
    });
  }
  if (xIsNumericLike && xMetaType !== 'quantitative') {
    transforms.push({
      calculate: `toNumber(replace(replace(datum["${xAxis.name}"], ",", ""), "%", ""))`,
      as: xAxis.name,
    });
  }
  if (yIsNumericLike && yMetaType !== 'quantitative') {
    transforms.push({
      calculate: `toNumber(replace(replace(datum["${y.name}"], ",", ""), "%", ""))`,
      as: y.name,
    });
  }

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: cloneDeep(data) },
    ...(transforms.length ? { transform: transforms } : {}),
    mark: {
      type: 'point',
      filled: true
    },
    encoding: {
      x: {
        field: xAxis.name,
        type: xTypeForEncoding,
        axis: {
          title: xAxis.name,
          labelOverlap: 'auto',
          labelLimit: 100,
          labelAngle: xIsNumericLike ? 0 : -45,
        },
      },
      y: {
        field: y.name,
        type: yTypeForEncoding,
        axis: { title: y.name, labelOverlap: 'auto' },
      },
      ...(colorField && {
        color: {
          field: colorFieldForEncoding!,
          type: colorIsNumericLike ? 'quantitative' : colorTypeFromMeta,
          legend: {
            title: colorField,
            format: !colorIsNumericLike && colorTypeFromMeta === 'temporal' ? '%Y-%m-%d' : undefined,
          },
          scale: colorIsNumericLike
            ? { range: ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8'] }
            : (colorTypeFromMeta === 'quantitative'
              ? { range: ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8'] }
              : undefined),
        },
      }),
      tooltip: [
        { field: xAxis.name, type: xTypeForEncoding },
        { field: y.name, type: yTypeForEncoding, title: y.name },
        ...(colorField
          ? [{
            field: colorIsNumericLike ? colorFieldForEncoding! : colorField,
            type: colorIsNumericLike ? 'quantitative' : colorTypeFromMeta,
            title: colorField,
          }]
          : []),
      ],
    },
  };
};

const ScatterChart = () => {
  const { tab } = useAppSelector(state => state.workflowPage);
  const experimentId = useAppSelector(state => state.progressPage?.experiment.data?.id || '');

  const meta = tab?.workflowTasks.dataExploration?.metaData;
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));

  const chartData =
    (tab?.workflowTasks.dataExploration?.scatterChart?.data
      ?.data as ScatterChartDataRow[]) ?? [];
  const xAxis = tab?.workflowTasks.dataExploration?.controlPanel.xAxis;
  const yAxis = tab?.workflowTasks.dataExploration?.controlPanel.yAxis;
  const colorBy = tab?.workflowTasks?.dataExploration?.controlPanel?.colorBy;
  const umap = tab?.workflowTasks.dataExploration?.controlPanel.umap;

  const yCount = Array.isArray(yAxis) ? yAxis.length : 0;
  const effectiveDisplayMode: 'overlay' | 'stacked' =
    yCount === 1 ? 'overlay' : 'stacked';

  useEffect(() => {
    const filters = tab?.workflowTasks.dataExploration?.controlPanel.filters;
    const datasetId =
      tab?.dataTaskTable.selectedItem?.data?.dataset?.source || '';
    const dataset = tab?.dataTaskTable.selectedItem?.data?.dataset;

    const cols = Array.from(
      new Set(
        [
          colorBy?.name,
          xAxis?.name,
          ...(yAxis?.map((axis: VisualColumn) => axis.name) || []),
        ].filter(
          (name): name is string =>
            typeof name === 'string' && name.trim() !== '',
        ),
      ),
    );

    if (!datasetId || !xAxis || !yAxis?.length || meta?.source !== tab?.dataTaskTable.selectedItem?.data?.dataset?.source) return;

    dispatch(
      fetchDataExplorationData({
        query: {
          dataSource: {
            source: datasetId,
            format: dataset?.format || '',
            sourceType: dataset?.sourceType || '',
            fileName: dataset?.name || '',
            runId: tab?.workflowId || '',
            experimentId: experimentId || ''

          },
          columns: cols,
          filters,
          limit: 10000
        },
        metadata: {
          workflowId: tab?.workflowId || '',
          queryCase: 'scatterChart',
        },
      }),
    );
  }, [
    tab?.workflowTasks.dataExploration?.controlPanel.xAxis,
    tab?.workflowTasks.dataExploration?.controlPanel.yAxis,
    tab?.workflowTasks.dataExploration?.controlPanel.filters,
    tab?.dataTaskTable.selectedItem?.data?.dataset?.source,
    tab?.workflowTasks.dataExploration?.controlPanel.colorBy,
  ]);

  const hasData = Array.isArray(chartData) && chartData.length > 0;

  const hasValidXAxis = xAxis && xAxis.name;
  const hasValidYAxis = Array.isArray(yAxis) && yAxis.length > 0;
  const hasValidColorBy = colorBy && colorBy.name;

  let infoMessageText = '';

  if (!hasValidXAxis || !hasValidYAxis || !hasValidColorBy) {
    infoMessageText =
      'Please select x-Axis, y-Axis and color fields to display the chart.';
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

  const getStackedScatterSpec = ({
    data,
    xAxis,
    yAxis,
    colorBy,
  }: {
    data: ScatterChartDataRow[];
    xAxis: VisualColumn;
    yAxis: VisualColumn[];
    colorBy?: VisualColumn;
  }) => {
    const charts = (yAxis ?? [])
      .filter((y): y is VisualColumn => Boolean(y?.name))
      .map(y => {
        const single = getSingleScatterSpec({ data, xAxis, y, colorBy }) as any;
      
        return {
          ...single,
          height: 220,
        };
      });
    
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      vconcat: charts,
      spacing: 12,
      resolve: {
        // each Y metric likely has different ranges
        scale: { y: 'independent' },
      },
    };
  };

  const shouldShowInfoMessage =
    !hasValidXAxis || !hasValidYAxis || !hasValidColorBy || !hasData;

  return (
    <Box sx={{ height: '99%' }}>
      {umap ? (
        <Uchart />
      ) : shouldShowInfoMessage &&
        !(
          tab?.workflowTasks.dataExploration?.scatterChart?.loading ||
          tab?.workflowTasks.dataExploration?.metaData?.loading
        ) ? (
          <ResponsiveCardVegaLite
            spec={{}}
            title="Scatter Chart"
            actions={false}
            controlPanel={<ScatterChartControlPanel />}
            infoMessage={info}
            showInfoMessage={true}
            maxHeight={isSmallScreen ? undefined : 500}
            aspectRatio={isSmallScreen ? 2.8 : 1.8}
          />
        ) : effectiveDisplayMode === 'overlay' ? (
          <ResponsiveCardVegaLite
            spec={getSingleScatterSpec({
              data: Array.isArray(chartData) ? chartData : [],
              xAxis: xAxis as VisualColumn,
              y: (yAxis as VisualColumn[])[0],
              colorBy: colorBy as VisualColumn,
            })}
            title="Scatter Chart"
            actions={false}
            controlPanel={<ScatterChartControlPanel />}
            blinkOnStart={false}
            infoMessage={info}
            showInfoMessage={false}
            maxHeight={500}
            aspectRatio={isSmallScreen ? 2.8 : 1.8}
            loading={
              tab?.workflowTasks.dataExploration?.scatterChart?.loading ||
              tab?.workflowTasks.dataExploration?.metaData?.loading
            }
            minHeight={300}
          />
        ) : (
          <ResponsiveCardVegaLite
            spec={getStackedScatterSpec({
              data: Array.isArray(chartData) ? chartData : [],
              xAxis: xAxis as VisualColumn,
              yAxis: yAxis as VisualColumn[],
              colorBy: colorBy as VisualColumn,
            })}
            title="Scatter Chart"
            actions={false}
            controlPanel={<ScatterChartControlPanel />}
            maxHeight={5000}
            loading={
              tab?.workflowTasks.dataExploration?.scatterChart?.loading ||
              tab?.workflowTasks.dataExploration?.metaData?.loading
            }
            isStatic={false}
          />
        )}
    </Box>
  );
};

export default ScatterChart;
