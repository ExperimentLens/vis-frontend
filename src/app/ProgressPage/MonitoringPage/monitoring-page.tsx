import { Box, Tab, Tabs, Paper, useTheme } from '@mui/material';
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
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import { getCache } from '../../../shared/utils/localStorageCache';
import { useLocation } from 'react-router-dom';
import ComparativeAnalysis from './ComparativeAnalysis/comparative-analysis';
import ExperimentExplainability from './ExperimentExplainability';
import LlmMonitoringOverview from './LLMOverview/llm-monitoring-overview';
import { useExperimentCapabilities, MONITOR_TAB } from '../../../shared/utils/experimentCapabilities';

const MonitoringPage = () => {
  const { visibleTable, selectedTab, workflowsTable } = useAppSelector(
    (state: RootState) => state.monitorPage,
  );
  const capabilities = useExperimentCapabilities();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const compareId = queryParams.get('compareId');
  const tabParam = queryParams.get('tab');
  const compareWorkflowsRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (compareId) {
      const parsed = getCache<{ workflowIds: string[] }>(compareId);

      if (parsed?.workflowIds) {
        compareWorkflowsRef.current = parsed.workflowIds;
      }
    }

    if (tabParam) {
      const requested = Number(tabParam);
      // Don't land on a tab whose capability is unavailable (e.g. ?tab=3 on a
      // non-explainability experiment) — fall back to the Overview tab.
      const blocked =
        (requested === MONITOR_TAB.EXPLAINABILITY && !capabilities.explainability) ||
        (requested === MONITOR_TAB.TRACES && !capabilities.traces);

      dispatch(setSelectedTab(blocked ? MONITOR_TAB.OVERVIEW : requested));
    }
  }, [compareId, tabParam, capabilities.explainability, capabilities.traces]);

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

  // If the selected tab's capability disappears (e.g. switching from an LLM to an ML
  // experiment while parked on Traces), fall back to Overview so we never render an
  // empty disabled tab.
  useEffect(() => {
    const onUnavailableTab =
      (selectedTab === MONITOR_TAB.TRACES && !capabilities.traces) ||
      (selectedTab === MONITOR_TAB.EXPLAINABILITY && !capabilities.explainability);

    if (onUnavailableTab) {
      dispatch(setSelectedTab(MONITOR_TAB.OVERVIEW));
    }
  }, [selectedTab, capabilities.traces, capabilities.explainability]);

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
            const searchParams = new URLSearchParams(location.search);

            searchParams.delete('compareId');
            searchParams.set('tab', newValue);
            navigate({
              pathname: location.pathname,
              search: searchParams.toString(),
            }, { replace: true });

            if (newValue === MONITOR_TAB.COMPARE) {
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
            icon={<DashboardRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Overview"
          />
          <Tab
            icon={<CompareArrowsRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Compare"
          />
          <Tab
            icon={<HubRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Traces"
            disabled={!capabilities.traces}
          />
          <Tab
            icon={<LightbulbOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label="Explainability"
            disabled={!capabilities.explainability}
          />
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
        {selectedTab === MONITOR_TAB.OVERVIEW && (

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
        {selectedTab === MONITOR_TAB.COMPARE && (
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
                    <MoreVertRoundedIcon style={{ color: theme.palette.action.active }} />
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
        {selectedTab === MONITOR_TAB.TRACES && <LlmMonitoringOverview />}
        {selectedTab === MONITOR_TAB.EXPLAINABILITY && <ExperimentExplainability />}
      </Box>
    </>
  );
};

export default MonitoringPage;

