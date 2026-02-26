import { useState } from 'react';
import { Zones } from '../Zones/zones';
import { OpenAipFilter } from './OpenAIP/open-aip-filter';
import { Layers as LayersIcon } from '@mui/icons-material';
import { Box, IconButton, Popover, Tooltip, Typography, useTheme } from '@mui/material';
import type { IDataset } from '../../../../shared/models/exploring/dataset.model';

const legendItems = [
  { label: 'Poor', color: '#FC6666' },
  { label: 'Fair', color: 'orange' },
  { label: 'Good', color: '#FFF966' },
  { label: 'Excellent', color: '#99FF99' },
];

export const MapLegend = ({ dataset }: { dataset: IDataset }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleOpenAipFilter = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseAipFilter = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'aip-filter-popover' : undefined;

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
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
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
      <Tooltip title="Airspace Filters" placement="left" arrow>
        <IconButton aria-describedby={id} onClick={handleOpenAipFilter}>
          <LayersIcon />
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        onClose={handleCloseAipFilter}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 300,
              maxHeight: '50vh',
            },
          },
        }}
      >
        <OpenAipFilter />
      </Popover>
    </Box>
  );
};
