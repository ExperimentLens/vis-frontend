import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { RootState } from '../../store/store';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  clearExperiment,
  clearWorkflows,
  fetchExperimentWorkflows,
  setIntialization,
  setMenuOptions,
} from '../../store/slices/progressPageSlice';
import ProgressPageLoading from './progress-page-loading';
import LeftMenu from './left-menu';
import ExperimentControls from './experiment-controls';
import { resetMonitoringPage } from '../../store/slices/monitorPageSlice';
import type { RunStatus } from '../../shared/models/experiment/run.model';

// Runs whose status or results can still change without the user doing anything.
const LIVE_STATUSES: RunStatus[] = ['RUNNING', 'SCHEDULED', 'PENDING_INPUT'];

interface ProgressPageProps {
  children?: ReactNode
}

const ProgressPage = (props: ProgressPageProps) => {
  const { experiment, initialization, menuOptions } = useAppSelector(
    (state: RootState) => state.progressPage,
  );
  const hasLiveRuns = useAppSelector((state: RootState) =>
    state.progressPage.workflows.data.some(w => LIVE_STATUSES.includes(w.status)),
  );
  const { experimentId } = useParams();
  const dispatch = useAppDispatch();
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const { children } = props;
  const location = useLocation();

  useEffect(() => {
    if (!experimentId) return;

    if (experimentId !== experiment.data?.id) {
      dispatch(clearExperiment());
      dispatch(clearWorkflows());
      dispatch(resetMonitoringPage());
      dispatch(setIntialization(false));
    }
  }, [experimentId]);

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      dispatch(setMenuOptions({ ...menuOptions, selected: 'experiments' }));

      return;
    }

    // Top-level pages, which live outside an experiment.
    if (pathParts[0] === 'settings' || pathParts[0] === 'datasets')
      dispatch(setMenuOptions({ ...menuOptions, selected: pathParts[0] }));
    else if (location.pathname.includes('workflow'))
      dispatch(setMenuOptions({ ...menuOptions, selected: 'monitoring' }));
    else dispatch(setMenuOptions({ ...menuOptions, selected: pathParts[1] }));
  }, [location]);

  useEffect(() => {
    if (experimentId && experimentId !== experiment.data?.id) {
      // dispatch(fetchExperiment(experimentId))
    }
  }, []);

  // useEffect(() => {
  //   const fetchWorkflows = () =>
  //     !experiment.loading &&
  //     experiment.data &&
  //     dispatch(fetchExperimentWorkflows(experiment?.data?.id ?? ''));
  //   intervalId.current = setInterval(fetchWorkflows, 1 * 60 * 1000);

  //   return () => {
  //     if (intervalId.current) {
  //       clearInterval(intervalId.current);
  //     }
  //   };
  // }, [experiment]);

  // The runs endpoint is heavy (all runs with their params and metrics), so poll it every
  // minute only while a run can still change; a finished experiment is checked every
  // 5 minutes for runs started later. A hidden tab skips its turns and catches up when shown.
  useEffect(() => {
    const id = experiment.data?.id;

    if (!id) return;

    const every = hasLiveRuns ? 60 * 1000 : 5 * 60 * 1000;
    let lastFetch = Date.now();
    const fetchWorkflows = () => {
      if (document.hidden || Date.now() - lastFetch < every - 1000) return;

      lastFetch = Date.now();
      dispatch(fetchExperimentWorkflows(id));
    };

    intervalId.current = setInterval(fetchWorkflows, every);
    document.addEventListener('visibilitychange', fetchWorkflows);

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      document.removeEventListener('visibilitychange', fetchWorkflows);
    };

  }, [experiment.data?.id, hasLiveRuns]);

  // useEffect(() => {
  //   if (workflows.data && workflows.data.length > 0) {
  //     workflows.data?.every(workflow => workflow.status === 'COMPLETED' || workflow.status === 'FAILED' || workflow.status === 'KILLED') &&
  //       intervalId.current &&
  //       clearInterval(intervalId.current);
  //   }
  // }, [workflows]);

  return (
    <>
      {!initialization ? (
        <ProgressPageLoading />
      ) : (
        <Box
          sx={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
          }}
        >
          {/* Left Menu - Full Height */}
          <Box
            sx={{
              width: !menuOptions.collapsed ? 'calc(15% + 16px)' : '56px',
              height: '100%',
              transition: 'width 0.3s ease',
              flexShrink: 0,
            }}
          >
            <LeftMenu />
          </Box>

          {/* Right Content Area */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: !menuOptions.collapsed
                ? 'calc(85% - 16px)'
                : 'calc(100% - 56px)',
              transition: 'width 0.3s ease',
            }}
          >
            {/* Experiment Controls */}
            {experimentId && (
              <Box sx={{ width: '100%' }}>
                <ExperimentControls />
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                rowGap: 2,
                flexGrow: 1,
                overflow: 'hidden', // Prevent overflow
                width: '100%',
                boxSizing: 'border-box',
                bgcolor: theme => theme.palette.mode === 'dark'
                  ? theme.palette.background.default
                  : theme.palette.customGrey.light,
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ProgressPage;
