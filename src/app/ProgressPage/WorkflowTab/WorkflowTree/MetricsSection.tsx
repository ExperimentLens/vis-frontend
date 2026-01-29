import { Box, Typography } from '@mui/material';
import { TreeItem2 } from '@mui/x-tree-view/TreeItem2';
import BarChartIcon from '@mui/icons-material/BarChart';
import theme from '../../../../mui-theme';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setSelectedId, setSelectedItem } from '../../../../store/slices/workflowPageSlice';

type Metric = { name: string; value: number; task?: string | null; };
type Props = { taskId: string; metrics: Metric[] | {name: string; task?: string; value?: number;}[] };

export default function MetricsSection({ taskId, metrics }: Props) {
  const dispatch = useAppDispatch();
  const {workflowSeriesMetrics} = useAppSelector(state => state.workflowPage.tab ?? {workflowSeriesMetrics: {data: [], loading: false, error: null}});

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return (
    <>
      <TreeItem2
        itemId={`metrics-header-${taskId}`}
        slotProps={{ content: { style: { pointerEvents: 'none', backgroundColor: 'transparent' } } }}
        label={
          <Box sx={{ px: 1, py: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Metrics</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, ml: 1 }}>({metrics.length})</Typography>
            </Box>
          </Box>
        }
      />
      {metrics.map((metric, index) => {
        const isSeiresMetric = workflowSeriesMetrics.data.some(m => m.name === metric.name && m.seriesMetric.length > 1);

        return (
          <TreeItem2
            key={`${metric.name}-${index}`}
            itemId={`metric-${taskId}-${index}`}
            label={
              <Box
                onClick={() => {
                  dispatch(setSelectedId(`metric-${taskId}-${index}`));
                  dispatch(setSelectedItem({ type: 'metric', data: { metric } }));
                }}
                sx={{ px: 1, py: 0.5, borderRadius: 1, cursor: 'pointer' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BarChartIcon 
                    fontSize="small" 
                    sx={{ 
                      mr: 1, 
                      color: isSeiresMetric ? theme.palette.success.main : theme.palette.primary.main 
                    }} 
                  />
                    <Typography variant="body2">{metric.name}: {metric.value && round2(metric.value)}</Typography>
                </Box>
              </Box>
            }
          />
        );
      })}
    </>
  );
}
