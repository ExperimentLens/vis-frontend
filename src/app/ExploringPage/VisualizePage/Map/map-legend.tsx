import { Box, Typography, useTheme } from '@mui/material';
import { Zones } from '../Zones/zones';
import type { IDataset } from '../../../../shared/models/exploring/dataset.model';

const legendItems = [
  { label: 'Poor', color: '#FC6666' },
  { label: 'Fair', color: 'orange' },
  { label: 'Good', color: '#FFF966' },
  { label: 'Excellent', color: '#99FF99' },
];

export const MapLegend = ({ dataset }: { dataset: IDataset }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        zIndex: 999,
        position: 'absolute',
        top: 10,
        right: 60,
        backgroundColor: theme.palette.background.paper,
        padding: '4px 6px',
        borderRadius: 2.5,
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {legendItems.map(item => (
        <Box
          key={item.label}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: item.color,
            }}
          />
          <Typography variant="body2">{item.label}</Typography>
        </Box>
      ))}
      <Box sx={{ marginTop: 1, marginBottom: 0.5 }}>
        <Zones dataset={dataset} />
      </Box>
    </Box>
  );
};
