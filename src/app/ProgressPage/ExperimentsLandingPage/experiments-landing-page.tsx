import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import type { RootState } from '../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { fetchAllExperiments } from '../../../store/slices/progressPageSlice';
import Loader from '../../../shared/components/loader';
import InfoMessage from '../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ExperimentsTable from './experiments-table';

const ExperimentsLandingPage = () => {
  const dispatch = useAppDispatch();
  const { experiments } = useAppSelector((state: RootState) => state.progressPage);

  useEffect(() => {
    dispatch(fetchAllExperiments());
  }, [dispatch]);

  const handleRefresh = () => dispatch(fetchAllExperiments());

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: (theme) => theme.palette.background.default,
          borderBottom: (theme) => theme.palette.customGrey.main,
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }} color="primary" noWrap>
          All Experiments
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden', px: 2, py: 2 }}>
        {experiments.loading && <Loader />}

        {!!experiments.error && !experiments.loading && (
          <InfoMessage
            message={experiments.error || 'Error while fetching experiments.'}
            type="info"
            icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
            fullHeight
          />
        )}

        {!experiments.loading && !experiments.error && (
          <ExperimentsTable
            experiments={experiments.data}
            loading={experiments.loading}
            onRefresh={handleRefresh}
          />
        )}
      </Box>
    </Box>
  );
};

export default ExperimentsLandingPage;
