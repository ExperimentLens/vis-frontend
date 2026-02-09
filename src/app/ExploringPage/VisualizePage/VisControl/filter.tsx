import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {
  useAppDispatch,
  useAppSelector,
  type RootState,
} from '../../../../store/store';
import {
  setCategoricalFilters,
  triggerDatasetUiUpdate,
} from '../../../../store/slices/exploring/datasetSlice';

export interface FilterProps {
  open: boolean;
  onClose: () => void;
}

export const Filter = ({ open, onClose }: FilterProps) => {
  const dispatch = useAppDispatch();
  const dataset = useAppSelector((state: RootState) => state.dataset.dataset);
  const { facets } = useAppSelector((state: RootState) => state.map);
  const { categoricalFilters } = useAppSelector(
    (state: RootState) => state.dataset,
  );

  const handleFilterChange = (dim: string, value: string | null) => {
    const newFilters = { ...categoricalFilters, [dim]: value || null };

    dispatch(setCategoricalFilters(newFilters));
    dispatch(triggerDatasetUiUpdate());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Filters</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 1 }}>
          {facets &&
            dataset.dimensions?.map((dim, i) =>
              facets[dim] ? (
                <Accordion key={i} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">{dim}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {facets[dim].map((value: string | null, idx: number) => (
                        <Chip
                          key={idx}
                          label={value}
                          color={
                            value === categoricalFilters[dim]
                              ? 'primary'
                              : 'default'
                          }
                          variant={
                            value === categoricalFilters[dim]
                              ? 'filled'
                              : 'outlined'
                          }
                          onClick={() => handleFilterChange(dim, value)}
                          clickable
                        />
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ) : null,
            )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
