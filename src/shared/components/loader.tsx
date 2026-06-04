import { Box, CircularProgress, Typography } from '@mui/material';

const Loader = () => {
  return(<Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
    }}
  >
    <CircularProgress />
    <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          Loading...
    </Typography>
  </Box>);
};

export default Loader;
