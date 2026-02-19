import { memo } from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import { useAppSelector } from '../../store/store';
import { Box, Typography } from '@mui/material';
import type { RootState } from '../../store/store';

const ProgressBar = memo(({ workflowStatus, workflowId, hasPercentage } : {workflowStatus : string, workflowId : string, hasPercentage?: boolean}) => {
  const workflow = useAppSelector(
    (state: RootState) => state.progressPage.workflows.data.find(w => w.id === workflowId)
  );

  let progressValue;

  if (workflowStatus === 'COMPLETED' || workflowStatus === 'FAILED' || workflowStatus === 'KILLED') {
    progressValue = 100;
  } else {
    if (workflow?.tasks === null || workflow?.tasks === undefined) {
      progressValue = 0;
    } else {
      const completedTasks = workflow?.tasks.filter(task => task.endTime).length;

      progressValue = (completedTasks / workflow?.tasks.length) * 100;
    }
  }
  const color = workflowStatus === 'COMPLETED' ? 'success' : workflowStatus === 'RUNNING' ? 'primary' : workflowStatus === 'PENDING_INPUT' || workflowStatus === 'PAUSED' ? 'warning' : 'error';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5 }}>
        <Typography variant="body2">{workflowStatus?.toLowerCase()}</Typography>
        {workflowStatus === 'RUNNING' && hasPercentage && <Typography variant="body2">{Math.floor(progressValue)}%</Typography>}
      </Box>
      <Box sx={{ width: '100%' }}>
        <LinearProgress sx={{ borderRadius: 4 }} color={color} value={progressValue} variant="determinate"/>
      </Box>
    </Box>
  );
});

export default ProgressBar;
