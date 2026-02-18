import { useEffect } from 'react';
import {
  Box,
  FormControl,
  Switch,
  Typography,
  Tooltip,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import PaletteIcon from '@mui/icons-material/Palette';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import type { SelectChangeEvent } from '@mui/material';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableMultiSelect from '../../../../shared/components/searchable-select-multiple';

const ScatterChartControlPanel = () => {
  const dispatch = useAppDispatch();
  const tab = useAppSelector(state => state.workflowPage.tab);
  const controlPanel = tab?.workflowTasks.dataExploration?.controlPanel;
  const columns =
    tab?.workflowTasks.dataExploration?.metaData?.data?.originalColumns || [];

  const xAxis = controlPanel?.xAxis;
  const yAxis = controlPanel?.yAxis || [];
  const colorBy = controlPanel?.colorBy;
  const viewMode = useAppSelector(
    state =>
      state.workflowPage.tab?.workflowTasks.dataExploration?.controlPanel
        ?.viewMode,
  );

  const yAxisCount = yAxis.length;

  useEffect(() => {
    const nextView = yAxisCount === 1 ? 'overlay' : 'stacked';

    if (viewMode !== nextView) {
      dispatch(setControls({ viewMode: nextView }));
    }
  }, [yAxisCount, viewMode]);

  const handleXAxisChange = (event: { target: { value: string } }) => {
    const selected = columns.find(col => col.name === event.target.value);

    if (selected) {
      dispatch(setControls({ xAxis: selected }));
    }
  };

  const handleYAxisChange = (event: SelectChangeEvent<string[]>) => {
    const selectedNames = event.target.value as string[];
    const selectedCols = selectedNames
      .map((name: string) => columns.find(col => col.name === name))
      .filter(Boolean) as typeof columns;

    dispatch(setControls({ yAxis: selectedCols }));
  };

  const handleColorByChange = (event: SelectChangeEvent<string>) => {
    const selected = columns.find(col => col.name === (event.target.value as string));

    if (selected) {
      dispatch(setControls({ colorBy: selected }));
    }
  };

  // Keep selectedColumns in sync with x/y/color
  useEffect(() => {
    const validYAxis = yAxis.filter(yCol =>
      columns.find(col => col.name === yCol.name),
    );

    if (validYAxis.length !== yAxis.length) {
      dispatch(setControls({ yAxis: validYAxis }));
    }

    const currentSelected = controlPanel?.selectedColumns || [];
    const requiredCols = [xAxis, ...validYAxis, colorBy].filter(Boolean) as NonNullable<typeof xAxis>[];

    const missingCols = requiredCols.filter(
      reqCol => !currentSelected.find(sel => sel.name === reqCol?.name)
    );

    if (missingCols.length > 0) {
      const updatedSelected = [
        ...currentSelected,
        ...missingCols.filter(Boolean),
      ];
      const cleanedSelected = updatedSelected.filter((col) => col?.name && col.type);

      dispatch(setControls({ selectedColumns: cleanedSelected }));
    }
  }, [columns, yAxis, xAxis, colorBy, controlPanel?.selectedColumns]);

  const isDisabled =
    Array.isArray(tab?.workflowTasks.dataExploration?.scatterChart.data?.data) &&
    !tab?.workflowTasks.dataExploration?.scatterChart.data?.data.length;

  const tooltipTitle = isDisabled ? 'Select columns and color' : '';

  return (
    columns.length > 0 && (
      <Box>
        <Box
          sx={{
            display: 'flex',
            gap: '1rem',
            flexDirection: 'row',
          }}
        >
          {/* X-Axis Selector */}
          <FormControl fullWidth>
            <SearchableSelect
              labelId="x-axis-select-label"
              inputLabel={
                <Box display="flex" alignItems="center" gap={1}>
                  <ShowChartIcon fontSize="small" />
                  X-Axis
                </Box>
              }
              label="X-Axis-----"
              value={xAxis?.name || ''}
              options={columns.map(col => col.name)}
              onChange={(value) => handleXAxisChange({ target: { value } })}
              menuMaxHeight={224}
              menuWidth={250}
              disabled={tab?.workflowTasks.dataExploration?.controlPanel.umap}
            />
          </FormControl>

          {/* Y-Axis Multi-Selector */}
          <FormControl fullWidth>
            <SearchableMultiSelect
              labelId="y-axis-multi-select-label"
              inputLabel={
                <Box display="flex" alignItems="center" gap={1}>
                  <ShowChartIcon fontSize="small" />
                  Y-Axis
                </Box>
              }
              label="Y-Axis-----"
              value={yAxis.map(col => col.name)}
              options={columns.map(col => col.name)}
              onChange={(selected) => {
                handleYAxisChange({
                  target: { value: selected },
                } as SelectChangeEvent<string[]>);
              }}
              menuMaxHeight={224}
              menuWidth={250}
              disabled={tab?.workflowTasks.dataExploration?.controlPanel.umap}
            />
          </FormControl>
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: '1rem',
            flexDirection: 'row',
            mt: 2,
          }}
        >
          <FormControl fullWidth sx={{ flex: 1 }} >
            <SearchableSelect
              labelId="color-by-select-label"
              inputLabel={
                <Box display="flex" alignItems="center" gap={1}>
                  <PaletteIcon fontSize="small" />
                  Color By
                </Box>
              }
              label="Color By-----"
              value={colorBy?.name || ''}
              options={columns.map(col => col.name)}
              onChange={value =>
                handleColorByChange({
                  target: { value },
                } as SelectChangeEvent<string>)
              }
              menuMaxHeight={224}
              menuWidth={250}
              disabled={tab?.workflowTasks.dataExploration?.controlPanel.umap}
            />
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                color: tab?.workflowTasks.dataExploration?.controlPanel.umap
                  ? 'primary.main'
                  : 'text.secondary'
              }}
            >
              UMAP
            </Typography>
            <Tooltip title={tooltipTitle} disableHoverListener={!isDisabled}>
              <span>
                <Switch
                  disabled={isDisabled}
                  checked={tab?.workflowTasks.dataExploration?.controlPanel.umap}
                  onChange={() =>
                    dispatch(
                      setControls({
                        umap: !tab?.workflowTasks.dataExploration?.controlPanel.umap,
                      }),
                    )
                  }
                  color="primary"
                  name="umap"
                  inputProps={{ 'aria-label': 'UMAP toggle switch' }}
                />
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    )
  );
};

export default ScatterChartControlPanel;
