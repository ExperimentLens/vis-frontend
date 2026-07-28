import { Box, Tab, Tabs, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import ParallelCoordinatePlot from './ParalleleCoodrinates/parallel-coordinate-plot';
import WorkflowTable from './WorkFlowTables/workflow-table';
import ScheduleTable from './WorkFlowTables/schedule-table';
import type { RootState } from '../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { Resizable } from 're-resizable';
import {
  bulkToggleWorkflowSelection,
  setSelectedTab,
  setVisibleTable,
} from '../../../store/slices/monitorPageSlice';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { getCache } from '../../../shared/utils/localStorageCache';
import { useLocation } from 'react-router-dom';
import ComparativeAnalysis from './ComparativeAnalysis/comparative-analysis';
import ExperimentExplainability from './ExperimentExplainability';
import LlmMonitoringOverview from './LLMOverview/llm-monitoring-overview';
import { useExperimentCapabilities } from '../../../shared/utils/experimentCapabilities';

const MonitoringPage = () => {
  const { visibleTable, selectedTab, workflowsTable } = useAppSelector(
    (state: RootState) => state.monitorPage,
  );
  const isLlmExperiment = useAppSelector(
    (state: RootState) => state.progressPage.experiment.data?.tags?.experiment_type?.toLowerCase() === 'llm',
  );
  const isMlExperiment = useAppSelector(
      (state: RootState) => state.progressPage.experiment.data?.tags?.experiment_type?.toLowerCase() === 'ml',
  );
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const compareId = queryParams.get('compareId');
  const tabParam = queryParams.get('tab');
  const compareWorkflowsRef = useRef<string[] | null>(null);

  const capabilities = useExperimentCapabilities();
  const hasExplainability = capabilities.explainability;
  const hasTraces = capabilities.traces;
  const TAB = {
    OVERVIEW: 0,
    COMPARE: 1,
    TRACES: 2,
    EXPLAINABILITY: 3,
  } as const;

  const canShowTraces = !isMlExperiment;
  const canShowExplainability = !isLlmExperiment;

  const isAllowedTab = (tab: number) => {
    if (tab === TAB.OVERVIEW) return true;
    if (tab === TAB.COMPARE) return true;
    if (tab === TAB.TRACES) return canShowTraces;
    if (tab === TAB.EXPLAINABILITY) return canShowExplainability;

    return false;
  };
  useEffect(() => {
    if (compareId) {
      const parsed = getCache<{ workflowIds: string[] }>(compareId);

      if (parsed?.workflowIds) {
        compareWorkflowsRef.current = parsed.workflowIds;
      }
    }

    if (tabParam) {
      const nextTab = Number(tabParam);
      dispatch(setSelectedTab(isAllowedTab(nextTab) ? nextTab : TAB.OVERVIEW));
    }
  }, [compareId, tabParam]);

  useEffect(() => {
    if (
      workflowsTable.initialized &&
      compareWorkflowsRef.current &&
      compareWorkflowsRef.current.length > 0
    ) {
      dispatch(bulkToggleWorkflowSelection(compareWorkflowsRef.current));
      compareWorkflowsRef.current = null;
    }
  }, [workflowsTable.initialized]);

  return (
    <>
      {/* Sticky Header: tabs + inline KPI strip */}
      <Box
        sx={{
          borderColor: theme => theme.palette.customGrey.main,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          width: '100%',
          px: 2,
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_event, newValue) => {
            if (!isAllowedTab(newValue)) return;

            const searchParams = new URLSearchParams(location.search);

            searchParams.delete('compareId');
            searchParams.set('tab', newValue);
            navigate({
              pathname: location.pathname,
              search: searchParams.toString(),
            }, { replace: true });

            if (newValue === TAB.COMPARE) {
              dispatch(setVisibleTable('workflows'));
            }
          }}
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              gap: 0.5,
              px: 1.5,
              minHeight: 44,
              textTransform: 'uppercase',
            },
          }}
        >
          <Tab
            value={TAB.OVERVIEW}
            icon={<DashboardRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Overview"
          />
          <Tab
            value={TAB.COMPARE}
            icon={<CompareArrowsRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Compare"
          />
          {!isMlExperiment && (
            <Tab
              value={TAB.TRACES}
              icon={<MoreVertRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Traces"
              disabled={!hasTraces}
            />
          )}
          {!isLlmExperiment && (
            <Tab
              value={TAB.EXPLAINABILITY}
              icon={<LightbulbOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label="Explainability"
              disabled={!hasExplainability}
            />
          )}
        </Tabs>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          px: 1.5,
          pt: 0,
          pb: 1.5,
        }}
      >
        {selectedTab === TAB.OVERVIEW && (
         
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ flex: '0 0 60%', minHeight: 320 }}>
                {visibleTable === 'workflows' ? (
                  <WorkflowTable />
                ) : (
                  <ScheduleTable />
                )}
              </Box>
              <Box sx={{ flex: 1, minHeight: 220 }}>
                <ParallelCoordinatePlot />
              </Box>
            </Box>
          
        )}
        {selectedTab === TAB.COMPARE && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              gap: 1.5,
            }}
          >
            <Resizable
              defaultSize={{
                width: '30%',
                height: '100%',
              }}
              minWidth="200px"
              enable={{
                top: false,
                right: true,
                bottom: false,
                left: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false,
              }}
              maxWidth="50%"
              maxHeight="100%"
              style={{ height: '100%', position: 'relative' }}
              handleStyles={{
                right: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  right: '-16px',
                  zIndex: 10,
                }
              }}
              handleComponent={{
                right: (
                  <Box
                    sx={{
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'ew-resize',
                    }}
                  >
                    <MoreVertRoundedIcon sx={{ color: 'action.active' }} />
                  </Box>
                )
              }}
            >
              <WorkflowTable />
            </Resizable>
            <Paper elevation={0} variant="outlined" sx={{ flex: 1, overflow: 'auto', height: '100%', borderRadius: 1.5 }}>
              <ComparativeAnalysis />
            </Paper>
          </Box>
        )}
        {selectedTab === TAB.TRACES && !isMlExperiment && (
          <LlmMonitoringOverview />
        )}

        {selectedTab === TAB.EXPLAINABILITY && !isLlmExperiment && (
          <ExperimentExplainability />
        )}      
      </Box>
    </>
  );
};

export default MonitoringPage;
