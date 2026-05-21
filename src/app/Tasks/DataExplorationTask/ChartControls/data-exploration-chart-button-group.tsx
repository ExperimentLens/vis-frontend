import type React from 'react';
import { alpha, Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import MapIcon from '@mui/icons-material/Map';
import TableChartIcon from '@mui/icons-material/TableChartSharp';
import GridOnIcon from '@mui/icons-material/GridOn';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { VisualColumn } from '../../../../shared/models/dataexploration.model';

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

  const buttons: { value: ChartType; label: string; icon: React.ReactNode; disabled?: boolean; disabledReason?: string }[] = [
    { value: 'datatable', label: 'Table', icon: <TableChartIcon fontSize="small" /> },
    { value: 'line', label: 'Line', icon: <ShowChartIcon fontSize="small" /> },
    { value: 'bar', label: 'Bar', icon: <BarChartIcon fontSize="small" />, disabled: disableBarChart, disabledReason: 'Pick a group-by column to enable bar chart' },
    { value: 'heatmap', label: 'Heatmap', icon: <GridOnIcon fontSize="small" />, disabled: disableHeatmap, disabledReason: 'Needs at least two string columns' },
    { value: 'scatter', label: 'Scatter', icon: <ScatterPlotIcon fontSize="small" /> },
    { value: 'map', label: 'Map', icon: <MapIcon fontSize="small" />, disabled: disableMap, disabledReason: 'Dataset has no lat/lon columns' },
  ];

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={chartType ?? null}
      onChange={(_, value: ChartType | null) => {
        if (value) dispatch(setControls({ chartType: value }));
      }}
      sx={{
        bgcolor: theme => alpha(theme.palette.action.selected, 0.35),
        borderRadius: 1.25,
        p: 0.25,
        gap: 0.25,
        '& .MuiToggleButton-root': {
          width: 28,
          height: 28,
          minWidth: 28,
          p: 0,
          border: 'none',
          borderRadius: 1,
          color: 'text.secondary',
          transition: 'background-color 120ms ease, color 120ms ease',
          '&:hover': {
            bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
            color: 'text.primary',
          },
          '&.Mui-selected': {
            bgcolor: 'background.paper',
            color: 'primary.main',
            boxShadow: theme => `0 1px 2px ${alpha(theme.palette.common.black, 0.12)}`,
            '&:hover': {
              bgcolor: 'background.paper',
            },
          },
          '&.Mui-disabled': {
            border: 'none',
            opacity: 0.35,
          },
          '& .MuiSvgIcon-root': { fontSize: 16 },
        },
      }}
    >
      {buttons.map(({ value, label, icon, disabled, disabledReason }) => (
        <Tooltip key={value} title={disabled ? disabledReason ?? label : label} arrow>
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <ToggleButton value={value} disabled={disabled} aria-label={label}>
              {icon}
            </ToggleButton>
          </Box>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
};

export default ChartButtonGroup;
