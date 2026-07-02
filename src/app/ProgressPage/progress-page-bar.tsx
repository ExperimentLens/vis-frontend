import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { grey } from '@mui/material/colors';
import type { RootState } from '../../store/store';
import { useAppSelector } from '../../store/store';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useParams } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import ErrorIcon from '@mui/icons-material/Error';

interface InlineStatProps {
  dotColor?: string;
  value: number | string;
  label: string;
  total?: number;
  tooltip?: string;
}

const InlineStat = ({ dotColor, value, label, total, tooltip }: InlineStatProps) => {
  const content = (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 0.5 }}>
      {dotColor && (
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
      )}
      <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.2 }}>
        {value}
        {typeof total === 'number' && (
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.25 }}>
            /{total}
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );

  return tooltip ? <Tooltip title={tooltip} arrow>{content}</Tooltip> : content;
};

const StatDivider = () => (
  <Box sx={{ width: 1, height: 18, bgcolor: 'divider', mx: 0.5 }} />
);

type ExperimentType = 'LLM' | 'ML' | 'HYBRID' | 'UNKNOWN';

const normalizeExperimentType = (value?: string): ExperimentType => {
  const type = value?.trim().toUpperCase();

  if (type === 'LLM') return 'LLM';
  if (type === 'ML') return 'ML';
  if (type === 'HYBRID') return 'HYBRID';

  return 'UNKNOWN';
};

const ProgressPageBar = () => {
  const { experimentId } = useParams();
  const { progressBar, experiment } = useAppSelector((state: RootState) => state.progressPage);
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  const isKilled = experiment?.data?.status === 'killed';
  const experimentType = normalizeExperimentType(
    experiment?.data?.tags?.experiment_type
  );

  const showExperimentType = experimentType !== 'UNKNOWN';

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`Experiment: ${experimentId}`}
            color="primary"
            variant="outlined"
            sx={{
              border: 'none',
              p: 0,
              alignContent: 'left',
              justifyContent: 'left',
              fontWeight: '600',
              '& .MuiChip-label': {
                fontSize: '1rem',
              },
              color: theme.palette.primary.main,
            }}
          />
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
            {showExperimentType && (
              <Chip
                size="small"
                variant="outlined"
                label={experimentType}
                className={`experiment-type-chip experiment-type-chip--${experimentType.toLowerCase()}`}
                sx={{minWidth: 'auto', mr: 0.5}}
              />
            )}
            <Typography
              variant="body2"
              fontWeight="medium"
              color="text.secondary"
              sx={{ mr: 0.5 }}
            >
              Progress:
            </Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={isKilled ? 'error' : 'secondary'}
            >
              {`${progressBar.progress}%`}
            </Typography>
          </Box>
          {isKilled && (
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: theme.palette.background.paper,
              gap: 0.5,
            }}>
              <ErrorIcon fontSize="small" color="error" />
              <Typography variant="body2" fontWeight="medium" color="error">
                killed
              </Typography>
            </Box>
          )}
        </Box>

        {matches && progressBar.total > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
            <InlineStat
              value={progressBar.total}
              label="workflows"
              tooltip="Total workflows"
            />
            <StatDivider />
            <InlineStat
              dotColor={progressBar.running > 0 ? theme.palette.warning.main : theme.palette.action.disabled}
              value={progressBar.running}
              total={progressBar.total}
              label="running"
              tooltip="Running or scheduled"
            />
            <InlineStat
              dotColor={theme.palette.success.main}
              value={progressBar.completed}
              total={progressBar.total}
              label="completed"
              tooltip="Successfully completed"
            />
            <InlineStat
              dotColor={progressBar.failed > 0 ? theme.palette.error.main : theme.palette.action.disabled}
              value={progressBar.failed}
              total={progressBar.total}
              label="failed"
              tooltip="Failed or killed"
            />
          </Stack>
        )}
      </Box>
      <Box sx={{ width: '100%', ml: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.round(progressBar.progress)}
          sx={{
            height: '1rem',
            borderRadius: 10,
            backgroundColor: grey[300],
            '& .MuiLinearProgress-bar': {
              background: isKilled
                ? 'linear-gradient(90deg, #d17b0f, #b32d00)'
                : theme => theme.palette.customGradient.gradient,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default ProgressPageBar;
