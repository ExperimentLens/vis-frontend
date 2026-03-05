import { Box, Button, Checkbox, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import {
  setEnabled,
  toggleEnabledAirspaceType,
} from '../../../../../store/slices/exploring/openAipSlice';
import { OpenAipAirspaceTypes } from '../../../../../shared/models/exploring/openaip/airspace.model';

export const OpenAipFilter = () => {
  const dispatch = useAppDispatch();
  const { enabledAirspaceTypes, enabled } = useAppSelector(
    state => state.openAip,
  );

  const handleAirspaceTypeChange = (type: number) => {
    dispatch(toggleEnabledAirspaceType(type));
  };

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
      >
        <Typography variant="h6">Airspaces</Typography>
        <Button
          variant={!enabled ? 'contained' : 'outlined'}
          color="primary"
          onClick={() => dispatch(setEnabled(!enabled))}
        >
          {enabled ? 'Disable' : 'Enable'}
        </Button>
      </Box>
      {enabled &&
        OpenAipAirspaceTypes.map((type, index) => (
          <Box key={type.label} display="flex" alignItems="center" gap={1}>
            <Checkbox
              sx={{
                '&.Mui-checked': {
                  color: type.color,
                },
              }}
              checked={enabledAirspaceTypes[index]}
              onChange={() => handleAirspaceTypeChange(index)}
            />
            <Typography variant="body1">{type.label ?? 'Other'}</Typography>
          </Box>
        ))}
    </Box>
  );
};
