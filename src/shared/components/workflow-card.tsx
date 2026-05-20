import { Paper, Box, Typography, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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
      elevation={0}
      variant="outlined"
      sx={{
        borderRadius: 2,
        width: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        rowGap: 0,
        minWidth: '300px',
        height: '100%',
        borderColor: theme => theme.palette.customGrey.main,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          background: theme => theme.palette.customSurface.cardHeader,
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={description}>
          <InfoOutlinedIcon
            sx={{ fontSize: 14, color: 'text.secondary', cursor: 'default' }}
          />
        </Tooltip>
      </Box>
      {children}
    </Paper>
  );
};

export default WorkflowCard;
