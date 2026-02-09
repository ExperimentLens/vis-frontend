import _ from 'lodash';
import { useState } from 'react';
import {
  Box,
  Chip,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  KeyboardDoubleArrowUp as KeyboardDoubleArrowUpIcon,
  KeyboardDoubleArrowDown as KeyboardDoubleArrowDownIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { IDataset } from '../../../shared/models/exploring/dataset.model';
import {
  useAppDispatch,
  useAppSelector,
  type RootState,
} from '../../../store/store';
import dayjs from 'dayjs';
import { Chart } from './Chart/chart';
import { TimeSeriesChart } from './TimeSeriesChart/time-series-chart';
// import { Filter } from './VisControl/filter';
import { TimeRange } from './VisControl/time-range';
import Stats from './Stats/stats';
import {
  setCategoricalFilters,
  triggerDatasetUiUpdate,
} from '../../../store/slices/exploring/datasetSlice';
import { Filter } from './VisControl/filter';

export const BottomBar = ({ dataset }: { dataset: IDataset }) => {
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { timeRange } = useAppSelector((state: RootState) => state.dataset);
  const { totalPointCount } = useAppSelector((state: RootState) => state.stats);
  const { activeSelection, drawnShape, selectedGeohash } = useAppSelector(
    (state: RootState) => state.map,
  );
  const { categoricalFilters } = useAppSelector(
    (state: RootState) => state.dataset,
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);

  const removeFilter = (dim: string) => {
    const newFilters = _.omit(categoricalFilters, [dim]);

    dispatch(setCategoricalFilters(newFilters));
    dispatch(triggerDatasetUiUpdate());
  };

  const Header = () => (
    <Box
      sx={{
        backgroundColor: theme => theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        justifyContent: 'space-between',
        padding: 1,
        alignItems: 'center',
        borderBottom: drawerOpen ? '1px solid ' : 'none',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          alignItems: 'center',
          maxWidth: '25%',
        }}
      >
        <Typography
          variant="h6"
          color="primary"
          onClick={() => setFilterOpen(true)}
          sx={{ cursor: 'pointer' }}
        >
          Filters
        </Typography>
        {/* Active filters */}
        <Box
          sx={{
            display: 'flex',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            // 1. Hide scrollbar by default
            '&::-webkit-scrollbar': {
              height: '6px',
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'transparent',
              borderRadius: '10px',
            },
            // 2. Show scrollbar on hover
            '&:hover': {
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#ccc', // Smooth gray appears
              },
            },
          }}
        >
          {categoricalFilters && Object.keys(categoricalFilters).length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              {Object.entries(categoricalFilters)
                .reverse()
                .map(([dim, value]) => (
                  <Chip
                    key={dim}
                    label={`${dim}: ${value}`}
                    onDelete={() => removeFilter(dim)}
                    deleteIcon={<CloseIcon />}
                    color="secondary"
                    variant="filled"
                  />
                ))}
            </Stack>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <IconButton onClick={() => setDrawerOpen(!drawerOpen)} size="small">
          {drawerOpen ? (
            <KeyboardDoubleArrowDownIcon />
          ) : (
            <KeyboardDoubleArrowUpIcon />
          )}
        </IconButton>
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
        <IconButton onClick={() => setDrawerOpen(!drawerOpen)} size="small">
          {drawerOpen ? (
            <KeyboardDoubleArrowDownIcon />
          ) : (
            <KeyboardDoubleArrowUpIcon />
          )}
        </IconButton>
      </Box>
      <Typography
        variant="h6"
        onClick={() => setTimeRangeOpen(true)}
        sx={{ cursor: 'pointer' }}
      >
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
      {/* <Filter /> */}
      <TimeRange open={timeRangeOpen} onClose={() => setTimeRangeOpen(false)} />
      <Filter open={filterOpen} onClose={() => setFilterOpen(false)} />
      <Header />
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
