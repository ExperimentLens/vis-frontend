import { useState } from 'react';
import { Box, Drawer, Paper, Typography } from '@mui/material';
import type { IDataset } from '../../../shared/models/exploring/dataset.model';
import { useAppSelector, type RootState } from '../../../store/store';
import dayjs from 'dayjs';
import { Chart } from './Chart/chart';
import { TimeSeriesChart } from './TimeSeriesChart/time-series-chart';
import Stats from './Stats/stats';

export const BottomBar = ({ dataset }: { dataset: IDataset }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { timeRange } = useAppSelector((state: RootState) => state.dataset);
  const { totalPointCount } = useAppSelector((state: RootState) => state.stats);
  const { activeSelection, drawnShape, selectedGeohash } = useAppSelector(
    (state: RootState) => state.map,
  );

  const Header = () => (
    <Box
      onClick={() => setDrawerOpen(!drawerOpen)}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        justifyContent: 'space-between',
        paddingX: 1,
        alignItems: 'center',
        cursor: 'pointer',
        borderBottom: drawerOpen ? '1px solid ' : 'none',
      }}
    >
      <Typography variant="h6">
        Measures:{' '}
        <Typography
          color="primary"
          fontWeight="bold"
          fontSize="1.2rem"
          component="span"
        >
          {dataset.measure0}
        </Typography>{' '}
        |{' '}
        <Typography
          color="primary"
          fontWeight="bold"
          fontSize="1.2rem"
          component="span"
        >
          {dataset.measure1}
        </Typography>
      </Typography>
      <Box>
        <Typography variant="h6">
          Total Points:{' '}
          <Typography
            color="primary"
            fontWeight="bold"
            fontSize="1.2rem"
            component="span"
          >
            {totalPointCount}
          </Typography>
        </Typography>
        <Typography variant="body1" color="primary" textAlign="center">
          {activeSelection === 'drawn'
            ? 'Drawn Area'
            : activeSelection === 'selectedGeohash'
              ? `Geohash: ${selectedGeohash.string}`
              : ''}
        </Typography>
      </Box>
      <Typography variant="h6">
        From:{' '}
        <Typography
          color="primary"
          fontWeight="bold"
          fontSize="1.2rem"
          component="span"
        >
          {dayjs(timeRange.from).format('DD/MM/YYYY HH:mm')}
        </Typography>{' '}
        to{' '}
        <Typography
          color="primary"
          fontWeight="bold"
          fontSize="1.2rem"
          component="span"
        >
          {timeRange.to
            ? dayjs(timeRange.to).format('DD/MM/YYYY HH:mm')
            : 'Present'}
        </Typography>
      </Typography>
    </Box>
  );

  return (
    <>
      <Paper>
        <Header />
      </Paper>
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Header />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(auto-fit, minmax(260px, 1fr))',
            },
            gap: 2,
            padding: 2,
            alignItems: 'stretch',
            flex: 1,
            overflow: 'auto',
          }}
        >
          <Stats dataset={dataset} />
          <Chart dataset={dataset} />
          {dataset.timeColumn && (drawnShape || selectedGeohash.rect) && (
            <TimeSeriesChart dataset={dataset} />
          )}
        </Box>
      </Drawer>
    </>
  );
};
