import { useEffect } from 'react';
import type { RootState } from '../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { fetchExperimentHighlights } from '../../../store/slices/experimentHighlightsSlice';
import { useNavigate, useParams } from 'react-router-dom';
import HighlightsGroupsCards from './highlights-group-cards';
import Loader from '../../../shared/components/loader';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoMessage from '../../../shared/components/InfoMessage';
import { Box, Divider, Typography, useTheme } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


const HighlightsPage = () => {
  const { experimentId } = useParams();
  const { experimentHighlights } = useAppSelector((state: RootState) => state.experimentHighlights);
  const { data, loading, error } = experimentHighlights;
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const navigate = useNavigate();
  

  useEffect(() => {
    if(experimentId) {
      dispatch(fetchExperimentHighlights(experimentId));
    }
  }, [experimentId]);

  const totalWorkflows =
        Object.values(data?.clusterInsights || {}).reduce(
          (sum: number, cluster: any) =>
            sum + (cluster?.metadata?.nWorkflows || 0),
          0
        ) || 0;

  const totalGroups = Object.keys(data?.clusterInsights || {}).length;

  if (loading) return <Loader />;

  return (
    <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{py: 2}}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArrowBackIcon
                sx={{ fontSize: 24, cursor: 'pointer', color: 'grey' }}
                onClick={() => navigate(`/${experimentId}/monitoring`)}
              />
          <LayersIcon color="primary" />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Smart Group View
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Group By: <strong>Auto-Clusters</strong> · {totalWorkflows} workflows · {totalGroups} groups
        </Typography>
        <Divider />
      </Box>
      { error ? (
        <InfoMessage
          message={error || 'Error while fetching groups.'}
          type="info"
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          fullHeight
        />
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <HighlightsGroupsCards />
        </Box>
      )}
    </Box>
  );
};

export default HighlightsPage;
