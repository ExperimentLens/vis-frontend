import { Box, Tab, Tabs, Stack, Chip, Typography, Tooltip, useTheme } from '@mui/material';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setSelectedComparisonTab } from '../../../../store/slices/monitorPageSlice';
import ComparisonMetricsCharts from './comparison-metrics-charts';
import ComparisonModelsCharts from './comparison-models-charts';
import ComparisonDataCharts from './comparison-data-charts';
import ComparativeAnalysisControls from './comparative-analysis-controls';
import LlmTrajectoryDiff from './TrajectoryDiff/llm-trajectory-diff';
import { useEffect } from 'react';
import { useExperimentCapabilities, COMPARE_TAB } from '../../../../shared/utils/experimentCapabilities';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import WaterfallChartRoundedIcon from '@mui/icons-material/WaterfallChartRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';

const ComparativeAnalysis = () => {
  const { selectedComparisonTab, workflowsTable } = useAppSelector(
    (state: RootState) => state.monitorPage,
  );
  const groupBy = useAppSelector(
    (state: RootState) => state.monitorPage.workflowsTable.groupBy,
  );
  const capabilities = useExperimentCapabilities();
  const theme = useTheme();

  const dispatch = useAppDispatch();

  useEffect(() => {
    // Grouping only supports the Metrics view; also bail out of a subtab whose
    // capability is unavailable (Models without explainability, Executions without traces).
    const subtabUnavailable =
      (selectedComparisonTab === COMPARE_TAB.MODELS && !capabilities.explainability) ||
      (selectedComparisonTab === COMPARE_TAB.EXECUTIONS && !capabilities.traces);

    if ((groupBy.length > 0 || subtabUnavailable) && selectedComparisonTab !== COMPARE_TAB.METRICS) {
      dispatch(setSelectedComparisonTab(COMPARE_TAB.METRICS));
    }
  }, [groupBy, selectedComparisonTab, capabilities.explainability, capabilities.traces]);

  const numSelected = workflowsTable.selectedWorkflows.length;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          borderColor: theme => theme.palette.customGrey.main,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          width: '100%',
          pr: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Tabs
            value={selectedComparisonTab}
            onChange={(_event, newValue) => {
              dispatch(setSelectedComparisonTab(newValue));
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ '& .MuiTab-root': { gap: 0.5, px: 1.5 } }}
          >
            <Tab
              icon={<InsightsRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="METRICS"
            />
            <Tab
              icon={<WaterfallChartRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="EXECUTIONS"
              disabled={groupBy.length > 0 || !capabilities.traces}
            />
            <Tab
              icon={<HubRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="MODELS"
              disabled={groupBy.length > 0 || !capabilities.explainability}
            />
            <Tab
              icon={<StorageRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="DATA"
              disabled={groupBy.length > 0 || !capabilities.datasets}
            />
          </Tabs>

          {numSelected > 0 && (
            <Tooltip title="Workflows being compared" arrow>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pr: 0.5 }}>
                <CompareArrowsRoundedIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {numSelected}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  comparing
                </Typography>
                {groupBy.length > 0 && (
                  <Chip
                    size="small"
                    label={`grouped by ${groupBy.length}`}
                    sx={{ ml: 0.5, height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                )}
              </Stack>
            </Tooltip>
          )}
        </Box>
      </Box>
      <ComparativeAnalysisControls />
      <Box sx={{ width: '100%', flexGrow: 1, overflow: 'auto' }}>
        {selectedComparisonTab === COMPARE_TAB.METRICS && <ComparisonMetricsCharts />}
        {selectedComparisonTab === COMPARE_TAB.EXECUTIONS && <LlmTrajectoryDiff />}
        {selectedComparisonTab === COMPARE_TAB.MODELS && <ComparisonModelsCharts />}
        {selectedComparisonTab === COMPARE_TAB.DATA && <ComparisonDataCharts />}
      </Box>
    </Box>
  );
};

export default ComparativeAnalysis;
