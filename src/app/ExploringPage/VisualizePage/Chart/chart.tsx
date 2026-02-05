import {
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  BubbleChart as BubbleChartIcon,
  GridOn as GridOnIcon,
} from '@mui/icons-material';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Card,
  CardHeader,
  CardContent,
} from '@mui/material';
import type { VisualizationSpec } from 'react-vega';
import ResponsiveVegaLite from '../../../../shared/components/responsive-vegalite';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { IDataset } from '../../../../shared/models/exploring/dataset.model';
import { AggregateFunctionType } from '../../../../shared/models/exploring/enum/aggregate-function-type.model';
import {
  setAggType,
  setChartType,
  setGroupByCols,
  setMeasureCol,
  triggerChartUpdate,
} from '../../../../store/slices/exploring/chartSlice';
import Loader from '../../../../shared/components/loader';
import InfoMessage from '../../../../shared/components/InfoMessage';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';

export interface IChartProps {
  dataset: IDataset;
}

export const Chart = (props: IChartProps) => {
  const { dataset } = props;
  const dimensions = dataset.dimensions || [];
  const { series } = useAppSelector((state: RootState) => state.stats);
  const { aggType, chartType, measureCol, groupByCols } = useAppSelector(
    (state: RootState) => state.chart,
  );
  const {
    loading: { executeQuery: loadingExecuteQuery },
  } = useAppSelector((state: RootState) => state.dataset);
  const dispatch = useAppDispatch();

  const xAxisOptions = dimensions.map(dim => ({
    key: dim,
    value: dim,
    text: dim,
  }));

  const aggTypeOptions = Object.values(AggregateFunctionType).map(
    (type, index) => ({
      key: `agg-type-${index}`,
      value: type,
      text: type,
    }),
  );

  let vegaSeriesData: Record<string, unknown>[] = [];

  if (chartType === 'heatmap') {
    vegaSeriesData = series?.map(groupedStat => ({
      x: groupedStat.group?.[0] ?? '',
      y: groupedStat.group?.[1] ?? '',
      value: groupedStat.value ?? 0,
    }));
  } else {
    vegaSeriesData = series?.map(s => ({
      category: s.group?.[0] ?? '',
      series: s.group?.[1] ?? '',
      value: s.value ?? 0,
    }));
  }

  const handleChartTypeChange = (type: string) => {
    if (type !== chartType) {
      if (type === 'heatmap') {
        const secondDim = dimensions.find(d => d !== groupByCols[0]);

        dispatch(setGroupByCols([groupByCols[0], secondDim!]));
      } else if (chartType === 'heatmap') {
        dispatch(setGroupByCols([groupByCols[0]]));
      }
      dispatch(setChartType(type));
      dispatch(triggerChartUpdate());
    }
  };

  const getVegaMarkType = (
    chartType: string,
  ): { type: 'bar' | 'line' | 'area' | 'rect'; point?: boolean } => {
    switch (chartType) {
      case 'column':
        return { type: 'bar' };
      case 'line':
        return { type: 'line', point: true };
      case 'area':
        return { type: 'area', point: true };
      case 'heatmap':
        return { type: 'rect' };
      default:
        return { type: 'bar' };
    }
  };

  const xAxis =
    groupByCols && groupByCols.length > 0
      ? dataset.dimensions?.find(d => d === groupByCols[0])
      : dataset.dimensions?.find(d => d === xAxisOptions[0].key);
  const yAxis =
    groupByCols && groupByCols.length > 1
      ? dataset.dimensions?.find(d => d === groupByCols[1])
      : dataset.dimensions?.find(d => d === xAxisOptions[1]?.key);

  const measure =
    dataset.measure0 == null
      ? null
      : dataset.measure0 === measureCol
        ? dataset.measure0
        : dataset.measure1;

  const spec: VisualizationSpec = {
    mark: getVegaMarkType(chartType),
    encoding:
      chartType === 'heatmap'
        ? {
          x: { field: 'x', type: 'nominal', title: xAxis },
          y: { field: 'y', type: 'nominal', title: yAxis },
          color: { field: 'value', type: 'quantitative' },
          tooltip: { field: 'value', type: 'quantitative' },
        }
        : {
          x: {
            field: 'category',
            type: 'nominal',
            title: xAxis,
            sort: { field: 'value', order: 'ascending' },
          },
          y: {
            field: 'value',
            type: 'quantitative',
            title: `${aggType}${aggType === AggregateFunctionType.COUNT ? '' : `(${measure})`}`,
          },
          tooltip: { field: 'value', type: 'quantitative' },
        },
    data: {
      values: vegaSeriesData,
    },
  };

  return (
    <Card
      sx={{
        boxShadow: 2,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {loadingExecuteQuery ? (
        <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Loader />
        </CardContent>
      ) : (
        <>
          <CardHeader
            sx={{ backgroundColor: 'action.hover', py: 1 }}
            title={
              <Stack
                direction="row"
                justifyContent="flex-end"
                alignItems="center"
                sx={{ width: '100%' }}
              >
                {vegaSeriesData.length > 0 && (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Bar Chart" placement="top">
                      <IconButton
                        color={chartType === 'column' ? 'primary' : 'default'}
                        onClick={() => handleChartTypeChange('column')}
                      >
                        <BarChartIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Line Chart" placement="top">
                      <IconButton
                        color={chartType === 'line' ? 'primary' : 'default'}
                        onClick={() => handleChartTypeChange('line')}
                      >
                        <ShowChartIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Area Chart" placement="top">
                      <IconButton
                        color={chartType === 'area' ? 'primary' : 'default'}
                        onClick={() => handleChartTypeChange('area')}
                      >
                        <BubbleChartIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Heatmap" placement="top">
                      <IconButton
                        color={chartType === 'heatmap' ? 'primary' : 'default'}
                        onClick={() => handleChartTypeChange('heatmap')}
                      >
                        <GridOnIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
            }
          />

          {vegaSeriesData.length > 0 ? (
            <CardContent
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ flex: 1, minHeight: 'auto' }}>
                <ResponsiveVegaLite
                  aspectRatio={1 / 0.5}
                  actions={false}
                  spec={spec}
                />
              </Box>
              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                justifyContent="center"
                spacing={2}
                mt={3}
              >
                {dataset.measure0 && (
                  <>
                    <Typography variant="caption" sx={{ mr: 1 }}>
                      Find
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        labelId="agg-type-label"
                        value={aggType}
                        label="Aggregate"
                        onChange={e => {
                          dispatch(
                            setAggType(e.target.value as AggregateFunctionType),
                          );
                          dispatch(triggerChartUpdate());
                        }}
                        variant="standard"
                      >
                        {aggTypeOptions.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.text}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}

                {dataset.measure0 &&
                  aggType !== AggregateFunctionType.COUNT && (
                  <>
                    <Typography variant="caption" sx={{ mx: 1 }}>
                        of
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        labelId="measure-label"
                        value={measure!}
                        label="Measure"
                        onChange={e => {
                          dispatch(setMeasureCol(e.target.value));
                          dispatch(triggerChartUpdate());
                        }}
                        variant="standard"
                      >
                        {[dataset.measure0, dataset.measure1].map(m => (
                          <MenuItem key={m} value={m!}>
                            {m}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}

                <Typography variant="caption" sx={{ mx: 1 }}>
                  per
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    labelId="xaxis-label"
                    value={xAxis || ''}
                    label="X axis"
                    onChange={e => {
                      dispatch(setGroupByCols([e.target.value]));
                      dispatch(triggerChartUpdate());
                    }}
                    variant="standard"
                  >
                    {xAxisOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.text}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {chartType === 'heatmap' && (
                  <>
                    <Typography variant="caption" sx={{ mx: 1 }}>
                      and
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        labelId="yaxis-label"
                        value={yAxis || ''}
                        label="Y axis"
                        onChange={e => {
                          dispatch(setGroupByCols([xAxis!, e.target.value]));
                          dispatch(triggerChartUpdate());
                        }}
                        variant="standard"
                      >
                        {xAxisOptions.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.text}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}
              </Stack>
            </CardContent>
          ) : (
            <CardContent
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <InfoMessage
                message="No Data Available."
                type="info"
                icon={
                  <ReportProblemRoundedIcon
                    sx={{ fontSize: 40, color: 'info.main' }}
                  />
                }
                fullHeight
              />
            </CardContent>
          )}
        </>
      )}
    </Card>
  );
};
