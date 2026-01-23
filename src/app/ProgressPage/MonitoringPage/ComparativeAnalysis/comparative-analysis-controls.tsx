import { Box, Button, ButtonGroup, Checkbox, Chip, Divider, FormControl, FormControlLabel, IconButton, InputLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Popover, Select, Switch, Tooltip, Typography } from '@mui/material';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setComparativeModelInstanceControlPanel, setComparativeVisibleMetrics, setDataComparisonSelectedColumns, setDataComparisonViewMode, setIsMosaic, setSelectedModelComparisonChart, setShowMisclassifiedOnly, setSortConfusionByF1, setSortRocByAuc } from '../../../../store/slices/monitorPageSlice';
import theme from '../../../../mui-theme';
import WindowRoundedIcon from '@mui/icons-material/WindowRounded';
import RoundedCornerRoundedIcon from '@mui/icons-material/RoundedCornerRounded';
import BlurLinearIcon from '@mui/icons-material/BlurLinear';
import { SectionHeader } from '../../../../shared/components/responsive-card-table';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import { useState } from 'react';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DownloadIcon from '@mui/icons-material/Download';
import CodeIcon from '@mui/icons-material/Code';
import FilterListIcon from '@mui/icons-material/FilterList';
import DatasetSelectorBar from './DataComparison/comparative-data-selector-bar';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { GridTableRowsIcon } from '@mui/x-data-grid';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import SearchableSelect from '../../../../shared/components/searchable-select';
import BarChartIcon from '@mui/icons-material/BarChart';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';

const ComparativeAnalysisControls = ()=> {
  const isMosaic = useAppSelector((state: RootState) => state.monitorPage.isMosaic);
  const selectedModelComparisonChart = useAppSelector((state: RootState) => state.monitorPage.selectedModelComparisonChart);
  const showMisclassifiedOnly = useAppSelector((state: RootState) => state.monitorPage.showMisclassifiedOnly);
  const sortRocByAuc = useAppSelector((state: RootState) => state.monitorPage.sortRocByAuc);
  const sortConfusionByF1 = useAppSelector((state: RootState) => state.monitorPage.sortConfusionByF1);
  const selectedComparisonTab = useAppSelector((state: RootState) => state.monitorPage.selectedComparisonTab);
  const comparativeVisibleMetrics = useAppSelector((state: RootState) => state.monitorPage.comparativeVisibleMetrics);
  const [anchorEl, setAnchorEl] = useState <null | HTMLElement>(null);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState <null | HTMLElement>(null);
  const [datasetAnchorEl, setDatasetAnchorEl] = useState<null | HTMLElement>(null);
  const [rocSortAnchorEl, setRocSortAnchorEl] = useState<HTMLElement | null>(null);
  const [cmSortAnchorEl, setCmSortAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(columnsAnchorEl);
  const isDatasetSelectorOpen = Boolean(datasetAnchorEl);
  const [metricsAnchorEl, setMetricsAnchorEl] = useState<null | HTMLElement>(null);
  const isMetricsMenuOpen = Boolean(metricsAnchorEl);
  const comparativeModelInstanceControlPanel = useAppSelector((state: RootState) => state.monitorPage.comparativeModelInstanceControlPanel);
  const selectedDataset = useAppSelector((state: RootState) => state.monitorPage.comparativeDataExploration.selectedDataset);
  const dataComparisonViewMode = useAppSelector((state: RootState) => state.monitorPage.comparativeDataExploration.dataComparisonViewMode);
  const commonDataAssets = useAppSelector((state: RootState) => state.monitorPage.comparativeDataExploration.commonDataAssets);
  const dataAssetsMetaData = useAppSelector((state: RootState) => state.monitorPage.comparativeDataExploration.dataAssetsMetaData);
  const dataAssetsControlPanel = useAppSelector(
    (state: RootState) =>
      selectedDataset
        ? state.monitorPage.comparativeDataExploration.dataAssetsControlPanel[selectedDataset]
        : undefined
  );
  const commonColumns = dataAssetsControlPanel?.commonColumns ?? [];
  const selectedColumns = dataAssetsControlPanel?.selectedColumns ?? [];

  const showDataComparisonViewModeToggle = (() => {
    if (selectedComparisonTab !== 2) return false;
    if (!selectedDataset) return true;

    const assets = commonDataAssets[selectedDataset];

    if (!Array.isArray(assets) || assets.length === 0) return true;

    const allImages = assets.every(({ workflowId }) => {
      const meta = dataAssetsMetaData?.[selectedDataset]?.[workflowId]?.meta;
      const datasetType = meta?.data?.datasetType;

      return typeof datasetType === 'string' && datasetType.match('IMAGE');
    });

    return !allImages;
  })();

  const { workflowsTable } = useAppSelector(
    (state: RootState) => state.monitorPage
  );

  const menuOpen = Boolean(anchorEl);
  const dispatch = useAppDispatch();
  const { xAxisOption, yAxisOption, options } = comparativeModelInstanceControlPanel;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnsAnchorEl(event.currentTarget);
  };

  const handleClose = () => setColumnsAnchorEl(null);

  const handleOpenMetricsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMetricsAnchorEl(event.currentTarget);
  };

  const handleCloseMetricsMenu = () => {
    setMetricsAnchorEl(null);
  };

  const datasetSelectorClicked = (event: React.MouseEvent<HTMLElement>) => {
    setDatasetAnchorEl(prev => (prev ? null : event.currentTarget));
  };

  const options1 = [
    { label: 'confusionMatrix', name: 'Confusion\nMatrix', icon: <WindowRoundedIcon /> },
    { label: 'rocCurve', name: 'Roc\nCurve', icon: <RoundedCornerRoundedIcon /> },
    { label: 'instanceView', name: 'Instance\nView', icon: <BlurLinearIcon /> }
  ];

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const cmMenuOpen = Boolean(cmSortAnchorEl);
  const rocMenuOpen = Boolean(rocSortAnchorEl);

  const handleCmMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setCmSortAnchorEl(event.currentTarget);
  };

  const handleRocMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setRocSortAnchorEl(event.currentTarget);
  };

  const closeRoc = () => setRocSortAnchorEl(null);
  const closeCm = () => setCmSortAnchorEl(null);

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        sx={{
          p: 2,
          minHeight: { xs: 16, lg: 40 },
          height: 'auto',
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
          overflowX: 'auto',
        }}
      >
        {selectedComparisonTab === 0 && (
          <Box>
            <Tooltip title="Select Metrics">
              <IconButton onClick={handleOpenMetricsMenu}>
                <ViewColumnIcon />
              </IconButton>
            </Tooltip>
            <Popover
              open={isMetricsMenuOpen}
              anchorEl={metricsAnchorEl}
              onClose={handleCloseMetricsMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                sx: {
                  width: 300,
                  maxHeight: 250,
                  overflow: 'hidden',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                  border: '1px solid rgba(0,0,0,0.04)',
                },
              }}
            >
              <SectionHeader icon={<GridTableRowsIcon fontSize="small" />} title="Visible Metrics" />
              <List sx={{ maxHeight: 200, overflowY: 'auto', px: 1 }}>
                {workflowsTable.uniqueMetrics
                  .filter(metric => metric !== 'rating')
                  .map((metricName) => (
                    <ListItem key={metricName} dense disablePadding>
                      <ListItemButton
                        onClick={() => {
                          const updated = comparativeVisibleMetrics.includes(metricName)
                            ? comparativeVisibleMetrics.filter(m => m !== metricName)
                            : [metricName, ...comparativeVisibleMetrics];

                          dispatch(setComparativeVisibleMetrics(updated));
                        }}
                      >
                        <ListItemIcon>
                          {comparativeVisibleMetrics.includes(metricName) ? (
                            <CheckBoxIcon color="primary" fontSize="small" />
                          ) : (
                            <CheckBoxOutlineBlankIcon fontSize="small" color="action" />
                          )}
                        </ListItemIcon>
                        <ListItemText primary={metricName} />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </Popover>
          </Box>
        )}
        {selectedComparisonTab === 1 ? (
          <Box display="flex" flexWrap="wrap" gap={1}>
            {options1.map(option => (
              <Chip
                key={option.label}
                label={option.name}
                icon={option.icon}
                clickable
                size="small"
                sx={{
                  height: 35,
                  px: 2,
                  borderRadius: 2,
                  fontWeight: 500,
                  background:
                      selectedModelComparisonChart === option.label
                        ? undefined
                        : theme.palette.customGrey.light,
                  '& .MuiChip-icon': {
                    fontSize: 25,
                    marginLeft: 0,
                    marginRight: 0.1,
                  },
                  '& .MuiChip-label': {
                    whiteSpace: 'pre-line',
                    textAlign: 'left',
                    lineHeight: 1.2,
                  },
                }}
                color={selectedModelComparisonChart === option.label ? 'primary' : 'default'}
                variant={selectedModelComparisonChart === option.label ? 'filled' : 'outlined'}
                onClick={() => dispatch(setSelectedModelComparisonChart(option.label))}
              />
            ))}
          </Box>
        ) : selectedComparisonTab === 2 && workflowsTable.selectedWorkflows.length > 0 && (
          <>
            <Box display="flex" flexWrap="wrap" gap={0.2}>
              <Tooltip title="Select Dataset">
                <IconButton onClick={datasetSelectorClicked}>
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Columns">
                <IconButton onClick={handleOpen}>
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>

            </Box>
            <Popover
              id={'Datasets'}
              open={isDatasetSelectorOpen}
              anchorEl={datasetAnchorEl}
              onClose={() => setDatasetAnchorEl(null)}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              PaperProps={{
                sx: {
                  width: '550px',
                  p: 2,
                  borderRadius: 1,
                  boxShadow: 3
                }
              }}
            >
              <DatasetSelectorBar />
            </Popover>
            <Popover
              id={'Columns'}
              open={open}
              anchorEl={columnsAnchorEl}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                elevation: 3,
                sx: {
                  width: 300,
                  maxHeight: 250,
                  overflow: 'hidden',
                  padding: 0,
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  mt: 1,
                  '& .MuiList-root': {
                    padding: 0,
                  }
                },
              }}
            >
              <SectionHeader icon={<GridTableRowsIcon fontSize="small" />} title="Visible Columns" />

              <List sx={{ width: '100%', py: 0, maxHeight: 200, overflow: 'auto' }}>
                {commonColumns.map(column => (
                  <ListItem
                    key={column.name}
                    disablePadding
                    sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' } }}
                  >
                    <ListItemButton
                      dense
                      onClick={() => {
                        if(!selectedDataset) return;
                        const updated = selectedColumns.includes(column.name)
                          ? selectedColumns.filter(col => col !== column.name)
                          : [...selectedColumns, column.name];

                        dispatch(
                          setDataComparisonSelectedColumns({
                            assetName: selectedDataset,
                            selectedColumns: updated,
                          }),
                        );
                      }}
                    >
                      <ListItemIcon>
                        {selectedColumns.includes(column.name) ? (
                          <CheckBoxIcon color="primary" fontSize="small" />
                        ) : (
                          <CheckBoxOutlineBlankIcon fontSize="small" color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={column.name}
                        primaryTypographyProps={{ fontSize: '0.95rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Popover>

          </>
        )}

        <Box
          display="flex"
          alignItems="center"
          flexWrap="wrap"
          gap={0.5}
          sx={{ ml: 'auto' }}
        >

          {showDataComparisonViewModeToggle && selectedComparisonTab === 2 && (
            <ButtonGroup
              size="small"
              variant="outlined" 
              aria-label="data comparison view mode" 
              sx={{ height: '30px' }}
            >
              <Tooltip title="Distribution Plots">
                <Button
                  variant={dataComparisonViewMode === 'overlay' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => dispatch(setDataComparisonViewMode('overlay'))}
                  disabled={!selectedDataset}
                >
                  <BarChartIcon />
                </Button>
              </Tooltip>
              <Tooltip title="Box Plots">
                <Button
                  variant={dataComparisonViewMode === 'boxplot' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => dispatch(setDataComparisonViewMode('boxplot'))}
                  disabled={!selectedDataset}
                >
                  <CandlestickChartIcon />
                </Button>
              </Tooltip>
            </ButtonGroup>
          )}

          {selectedModelComparisonChart === 'instanceView' && selectedComparisonTab === 1 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={showMisclassifiedOnly}
                  size="small"
                  onChange={(e) => dispatch(setShowMisclassifiedOnly(e.target.checked))}
                />
              }
              label="Misclassified"
              sx={{ ml: 0.5 }}
            />
          )}

          {selectedComparisonTab !== 2 && (
            <ButtonGroup variant="contained" aria-label="view mode" sx={{ height: '25px' }}>
              <Button
                variant={isMosaic ? 'contained' : 'outlined'}
                disabled={selectedComparisonTab === 2}
                color="primary"
                onClick={() => dispatch(setIsMosaic(true))}
              >
                  Mosaic
              </Button>
              <Button
                variant={!isMosaic ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => dispatch(setIsMosaic(false))}
              >
                  Stacked
              </Button>
            </ButtonGroup>
          )}
        {/* create a shared popo over component in order to avoid copy pasting */}  
          {selectedModelComparisonChart === 'confusionMatrix' && selectedComparisonTab === 1 && (
            <>
              <IconButton
                aria-label="settings"
                onClick={handleCmMenuClick}
                sx={{
                  position: 'relative',
                  '& svg': { zIndex: 1, position: 'relative' },
                }}
              >
                <SettingsIcon />
              </IconButton>
              <Menu
                anchorEl={cmSortAnchorEl}
                open={cmMenuOpen}
                onClose={closeCm}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    width: 320,
                    maxHeight: 500,
                    padding: 0,
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                    border: '1px solid rgba(0,0,0,0.04)',
                    mt: 0,
                  },
                }}
                MenuListProps={{ sx: { pt: 0 } }}
              >
                <SectionHeader
                  icon={<SettingsSuggestIcon fontSize="small" />}
                  title="Control Options"
                />
                <Box sx={{ mt: 2 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortConfusionByF1}
                      size="small"
                      onChange={(e) => {
                        dispatch(setSortConfusionByF1(e.target.checked));
                        setCmSortAnchorEl(null);
                      }}
                    />
                  }
                  label="Sort by F1"
                  sx={{ ml: 0.5 }}
                />
              </Menu>
            </>
          )}

          {selectedModelComparisonChart === 'rocCurve' && selectedComparisonTab === 1 && (
            <>
              <IconButton
                aria-label="settings"
                onClick={handleRocMenuClick}
                sx={{
                  position: 'relative',
                  '& svg': { zIndex: 1, position: 'relative' },
                }}
              >
                <SettingsIcon />
              </IconButton>
              <Menu
                anchorEl={rocSortAnchorEl}
                open={rocMenuOpen}
                onClose={closeRoc}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    width: 320,
                    maxHeight: 500,
                    padding: 0,
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                    border: '1px solid rgba(0,0,0,0.04)',
                    mt: 0,
                  },
                }}
                MenuListProps={{ sx: { pt: 0 } }}
              >
                <SectionHeader
                  icon={<SettingsSuggestIcon fontSize="small" />}
                  title="Control Options"
                />
                <Box sx={{ mt: 2 }} />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sortRocByAuc}
                        size="small"
                        onChange={(e) => {
                          dispatch(setSortRocByAuc(e.target.checked));
                          setRocSortAnchorEl(null);
                        }}
                      />
                    }
                    label="Sort by AUC"
                    sx={{ ml: 0.5 }}
                  />
              </Menu>
            </>
          )}

          {selectedModelComparisonChart === 'instanceView' && selectedComparisonTab === 1 && (
            <>
              <IconButton
                aria-label="settings"
                onClick={handleMenuClick}
                sx={{
                  position: 'relative',
                  '& svg': { zIndex: 1, position: 'relative' },
                }}
              >
                <SettingsIcon />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    width: 320,
                    maxHeight: 500,
                    padding: 0,
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
                    border: '1px solid rgba(0,0,0,0.04)',
                    mt: 0,
                  },
                }}
                MenuListProps={{ sx: { pt: 0 } }}
              >
                <SectionHeader
                  icon={<SettingsSuggestIcon fontSize="small" />}
                  title="Control Options"
                />
                <Box sx={{ mt: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 1.5 }}>

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
                      value={xAxisOption}
                      options={options.filter(option => option !== yAxisOption)}
                      onChange={value =>
                        dispatch(
                          setComparativeModelInstanceControlPanel({ xAxisOption: value }),
                        )
                      }
                      disabled={comparativeModelInstanceControlPanel.useUmap}
                      menuMaxHeight={224}
                      menuWidth={250}
                    />
                  </FormControl>

                  <FormControl fullWidth>
                    <SearchableSelect
                      labelId="y-axis-select-label"
                      inputLabel={
                        <Box display="flex" alignItems="center" gap={1}>
                          <ShowChartIcon fontSize="small" />
                          Y-Axis
                        </Box>
                      }
                      label="Y-Axis-----"
                      value={yAxisOption}
                      options={options.filter(option => option !== xAxisOption)}
                      onChange={value =>
                        dispatch(
                          setComparativeModelInstanceControlPanel({ yAxisOption: value }),
                        )
                      }
                      disabled={comparativeModelInstanceControlPanel.useUmap}
                      menuMaxHeight={224}
                      menuWidth={250}
                    />
                  </FormControl>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      UMAP
                    </Typography>

                    <Switch
                      checked={comparativeModelInstanceControlPanel.useUmap}
                      onChange={(e) =>
                        dispatch(
                          setComparativeModelInstanceControlPanel({ useUmap: e.target.checked })
                        )
                      }
                      color="primary"
                    />
                  </Box>
                </Box>
                <Divider sx={{ mt: 1, opacity: 0.6 }} />
                <Box sx={{ py: 1 }}>
                  <MenuItem  sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <DownloadIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Download as PNG"
                      secondary="Save chart as image"
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </MenuItem>
                  <MenuItem  sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <CodeIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Download Data as JSON"
                      secondary="Export chart's underlying data"
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </MenuItem>
                </Box>

              </Menu>
            </>
          )}
        </Box>
      </Box>

      <Divider
        sx={{
          my: 0.5,
          borderBottomWidth: 2,
          borderColor: 'grey.300',
        }}
      />
    </>
  );
};

export default ComparativeAnalysisControls;
