import type React from 'react';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import MapIcon from '@mui/icons-material/Map';
import TableChartIcon from '@mui/icons-material/TableChartSharp';
import GridOnIcon from '@mui/icons-material/GridOn';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { VisualColumn } from '../../../../shared/models/dataexploration.model';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';

type ChartType = 'datatable' | 'line' | 'bar' | 'heatmap' | 'scatter' | 'map';

const ChartButtonGroup: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(state => state.workflowPage);
  const chartType = tab?.workflowTasks.dataExploration?.controlPanel.chartType;
  const columns = tab?.workflowTasks?.dataExploration?.metaData?.data?.originalColumns;
  const hasBarGroupBy = tab?.workflowTasks.dataExploration?.controlPanel?.barGroupBy &&
    tab?.workflowTasks.dataExploration?.controlPanel?.barGroupBy.length > 0;
  const stringColumnsCount = columns?.filter((col: VisualColumn) => col?.type === 'STRING').length || 0;
  const disableHeatmap = stringColumnsCount < 2;
  const disableBarChart = !hasBarGroupBy;
  const disableMap = tab?.workflowTasks.dataExploration?.metaData.data?.hasLatLonColumns === false;

  const options = [
    { value: 'datatable', icon: <TableChartIcon fontSize="small" />, tooltip: 'Table' },
    { value: 'line', icon: <ShowChartIcon fontSize="small" />, tooltip: 'Line' },
    {
      value: 'bar',
      icon: <BarChartIcon fontSize="small" />,
      tooltip: disableBarChart ? 'Pick a group-by column to enable bar chart' : 'Bar',
      disabled: disableBarChart,
    },
    {
      value: 'heatmap',
      icon: <GridOnIcon fontSize="small" />,
      tooltip: disableHeatmap ? 'Needs at least two string columns' : 'Heatmap',
      disabled: disableHeatmap,
    },
    { value: 'scatter', icon: <ScatterPlotIcon fontSize="small" />, tooltip: 'Scatter' },
    {
      value: 'map',
      icon: <MapIcon fontSize="small" />,
      tooltip: disableMap ? 'Dataset has no lat/lon columns' : 'Map',
      disabled: disableMap,
    },
  ];

  return (
    <SegmentedToggle
      aria-label="chart type"
      value={chartType ?? ''}
      onChange={value => dispatch(setControls({ chartType: value as ChartType }))}
      options={options}
    />
  );
};

export default ChartButtonGroup;
