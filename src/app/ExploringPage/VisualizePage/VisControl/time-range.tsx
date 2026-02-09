import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  useTheme,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';

import {
  useAppDispatch,
  useAppSelector,
  type RootState,
} from '../../../../store/store';
import {
  setTimeRange,
  triggerDatasetUiUpdate,
} from '../../../../store/slices/exploring/datasetSlice';

export interface TimeRangeProps {
  open: boolean;
  onClose: () => void;
}

export const TimeRange = ({ open, onClose }: TimeRangeProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const dataset = useAppSelector((state: RootState) => state.dataset.dataset);
  const [activeDate, setActiveDate] = useState(0);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dataset.timeMin ? dayjs(dataset.timeMin) : null,
    null,
  ]);

  useEffect(() => {
    setActiveDate(0);
    setDateRange([dataset.timeMin ? dayjs(dataset.timeMin) : null, null]);
  }, [dataset.timeMin]);

  const minDateTime = dataset.timeMin
    ? dayjs(dataset.timeMin - 5 * 60 * 1000)
    : undefined;
  const maxDateTime = dataset.timeMax
    ? dayjs(dataset.timeMax + 5 * 60 * 1000)
    : undefined;

  const handleRangeListClick = (id: number) => {
    setActiveDate(id);
    const now = Date.now();
    const start = 30 * 24 * 60 * 60 * 1000;
    let t;

    switch (id) {
      case 1:
        t = { from: now - start, to: null };
        break;
      case 2:
        t = { from: now - start / 2, to: null };
        break;
      case 3:
        t = { from: now - start / 4, to: null };
        break;
      case 4:
        t = { from: now - start / 10, to: null };
        break;
      case 5:
        t = { from: now - start / 30, to: null };
        break;
      default:
        t = { from: dataset.timeMin ?? 0, to: null };
    }

    dispatch(setTimeRange(t));
    dispatch(triggerDatasetUiUpdate());
    setDateRange([null, null]);
  };

  const handleDateChange = (newValue: [Dayjs | null, Dayjs | null]) => {
    setDateRange(newValue);

    const [from, to] = newValue;

    if (from && to) {
      dispatch(setTimeRange({ from: from.valueOf(), to: to.valueOf() }));
      dispatch(triggerDatasetUiUpdate());
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        Time Range
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack
            direction="row"
            gap={1}
            flexWrap="wrap"
            justifyContent="center"
          >
            {['All', '1M', '2W', '1W', '3D', '1D'].map((label, i) => (
              <Button
                key={i}
                size="small"
                variant={activeDate === i ? 'contained' : 'text'}
                onClick={() => handleRangeListClick(i)}
              >
                {label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" justifyContent="space-evenly">
            <DateTimePicker
              ampm={false}
              label="Start date"
              value={dateRange[0]}
              onChange={newValue => handleDateChange([newValue, dateRange[1]])}
              minDateTime={minDateTime}
              maxDateTime={maxDateTime}
              slotProps={{
                textField: {
                  size: 'small',
                },
              }}
            />
            <DateTimePicker
              ampm={false}
              label="End date"
              value={dateRange[1]}
              onChange={newValue => handleDateChange([dateRange[0], newValue])}
              minDateTime={minDateTime}
              slotProps={{
                textField: {
                  size: 'small',
                },
              }}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onClose}
          color="primary"
          variant="contained"
          size="small"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
