import { Paper, Box, Typography, Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const WorkflowCard: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
}> = ({
  title = 'Title',
  children = <></>,
  description = 'Description not available.',
}) => {
  return (
    <Paper
      className="Category-Item"
      elevation={2}
      sx={{
        borderRadius: 4,
        width: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        rowGap: 0,
        minWidth: '300px',
        height: '100%',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography fontSize={'1rem'} fontWeight={600}>
          {title}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={description}>
          <IconButton>
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {children}
    </Paper>
  );
};

export default WorkflowCard;
