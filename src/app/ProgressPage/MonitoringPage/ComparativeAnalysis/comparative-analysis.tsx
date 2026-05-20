import { Box, Tab, Tabs, Stack, Chip, Typography, Tooltip, useTheme } from '@mui/material';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setSelectedComparisonTab } from '../../../../store/slices/monitorPageSlice';
import ComparisonMetricsCharts from './comparison-metrics-charts';
import ComparisonModelsCharts from './comparison-models-charts';
import ComparisonDataCharts from './comparison-data-charts';
import ComparativeAnalysisControls from './comparative-analysis-controls';
import { useEffect, useMemo } from 'react';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';

const ComparativeAnalysis = () => {
  const { selectedComparisonTab, workflowsTable } = useAppSelector(
    (state: RootState) => state.monitorPage,
  );
  const groupBy = useAppSelector(
    (state: RootState) => state.monitorPage.workflowsTable.groupBy,
  );
  const { workflows } = useAppSelector(
    (state: RootState) => state.progressPage,
  );
  const theme = useTheme();

  const dispatch = useAppDispatch();

  const hasExplainability = useMemo(() => {
    if (workflows.data.every(workflow => !workflow.tasks)) return true;

    return workflows.data.some(workflow => workflow.tasks?.some(t => typeof t.name === 'string' && /explainability/i.test(t.name)))
      && !workflows.data.some(workflow => workflow.dataAssets?.some(asset => asset.name === 'model.pt'));
  }, [workflows]);

  useEffect(() => {
    if (groupBy.length > 0 && selectedComparisonTab !== 0) {
      dispatch(setSelectedComparisonTab(0));
    }
  }, [groupBy, selectedComparisonTab]);

  const numSelected = workflowsTable.selectedWorkflows.length;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          borderColor: theme => theme.palette.customGrey.main,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          width: '100%',
          px: 1.5,
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
              label="Metrics"
            />
            <Tab
              icon={<HubRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Models"
              disabled={groupBy.length > 0 || !hasExplainability}
            />
            <Tab
              icon={<StorageRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Data"
              disabled={groupBy.length > 0}
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
        {selectedComparisonTab === 0 && <ComparisonMetricsCharts />}
        {selectedComparisonTab === 1 && <ComparisonModelsCharts />}
        {selectedComparisonTab === 2 && <ComparisonDataCharts />}
      </Box>
    </Box>
  );
};

export default ComparativeAnalysis;
