import { Paper, Box, Typography, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { cardSurfaceSx, cardHeaderSx } from '../styles/card-surface';

const WorkflowCard: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
  accent?: string
}> = ({
  title = 'Title',
  children = <></>,
  description = 'Description not available.',
  accent,
}) => {
  return (
    <Paper
      className="Category-Item"
      elevation={0}
      sx={[
        cardSurfaceSx({ accent }),
        {
          width: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 0,
          minWidth: '300px',
          height: '100%',
        },
      ]}
    >
      <Box sx={cardHeaderSx()}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
