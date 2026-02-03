import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { grey } from '@mui/material/colors';

const Loader = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" sx={{ ml: 1, color: grey[600] }}>
        Loading...
      </Typography>
    </Box>
  );
};

export default Loader;
