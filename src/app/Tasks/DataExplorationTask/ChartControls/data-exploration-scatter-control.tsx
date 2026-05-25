import { useEffect } from 'react';
import {
  Box,
  FormControl,
  Tooltip,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import PaletteIcon from '@mui/icons-material/Palette';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import type { SelectChangeEvent } from '@mui/material';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableMultiSelect from '../../../../shared/components/searchable-select-multiple';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';

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
          <FormControl fullWidth size="small">
            <SearchableSelect
              labelId="x-axis-select-label"
              inputLabel={
                <Box display="flex" alignItems="center" gap={0.5}>
                  <ShowChartIcon sx={{ fontSize: 14 }} />
                  X-Axis
                </Box>
              }
              label="X-Axis"
              value={xAxis?.name || ''}
              options={columns.map(col => col.name)}
              onChange={(value) => handleXAxisChange({ target: { value } })}
              menuMaxHeight={224}
              menuWidth={250}
              disabled={tab?.workflowTasks.dataExploration?.controlPanel.umap}
            />
          </FormControl>

          {/* Y-Axis Multi-Selector */}
          <FormControl fullWidth size="small">
            <SearchableMultiSelect
              labelId="y-axis-multi-select-label"
              inputLabel={
                <Box display="flex" alignItems="center" gap={0.5}>
                  <ShowChartIcon sx={{ fontSize: 14 }} />
                  Y-Axis
                </Box>
              }
              label="Y-Axis"
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
          <FormControl fullWidth size="small" sx={{ flex: 1 }}>
            <SearchableSelect
              labelId="color-by-select-label"
              inputLabel={
                <Box display="flex" alignItems="center" gap={0.5}>
                  <PaletteIcon sx={{ fontSize: 14 }} />
                  Color By
                </Box>
              }
              label="Color By"
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
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0.5 }}>
            <Tooltip title={tooltipTitle} disableHoverListener={!isDisabled}>
              <span>
                <SegmentedToggle
                  aria-label="projection mode"
                  value={tab?.workflowTasks.dataExploration?.controlPanel.umap ? 'umap' : 'features'}
                  onChange={(v) => dispatch(setControls({ umap: v === 'umap' }))}
                  options={[
                    { value: 'features', label: 'Features', disabled: isDisabled },
                    { value: 'umap', label: 'UMAP', disabled: isDisabled },
                  ]}
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
