import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import type { Observation } from '../../../shared/models/observability/observation';
import { MONO } from '../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import ObservationWaterfall, { colorForType } from './trace-observation-waterfall';
import SpanDetail from './span-detail';

type TimelineTabProps = {
  observations: Observation[];
  selectedSpanId: string | null;
  defaultSpanId: string | null;
  selectedObs?: Observation;
  onSelectSpan: (id: string | null) => void;
};

const TimelineTab = ({ observations, selectedSpanId, defaultSpanId, selectedObs, onSelectSpan }: TimelineTabProps) => (
  <Stack spacing={1.25}>
    {observations.length > 0 && <TimelineSummary observations={observations} />}

    <ResponsiveCardTable title="Observation Waterfall" showSettings={false} showFullScreenButton={false}>
      <ObservationWaterfall observations={observations} selectedId={selectedSpanId ?? defaultSpanId} onSelect={onSelectSpan} />
    </ResponsiveCardTable>

    {selectedObs && <SpanDetail obs={selectedObs} />}
  </Stack>
);

const TimelineSummary = ({ observations }: { observations: Observation[] }) => {
  const theme = useTheme();

  const byType = observations.reduce<Record<string, number>>((acc, observation) => {
    const type = (observation.type ?? '').toUpperCase() || 'UNKNOWN';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  const errors = observations.filter(
    observation => (observation.level ?? '').toUpperCase() === 'ERROR' || Boolean(observation.statusMessage),
  ).length;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
      <CountPill color={theme.palette.text.secondary} label="SPANS" value={observations.length} />
      {Object.entries(byType).map(([type, count]) => (
        <CountPill key={type} color={colorForType(type)} label={type} value={count} />
      ))}
      {errors > 0 && (
        <CountPill
          color={theme.palette.error.main}
          label="ERRORS"
          value={errors}
          icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 12 }} />}
        />
      )}
    </Stack>
  );
};

const CountPill = ({
  color,
  label,
  value,
  icon,
}: {
  color: string;
  label: string;
  value: number;
  icon?: React.ReactNode;
}) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 0.85,
      py: 0.3,
      borderRadius: 999,
      bgcolor: alpha(color, 0.1),
      border: `1px solid ${alpha(color, 0.3)}`,
    }}
  >
    {icon ?? <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />}
    <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.62rem', fontWeight: 700, color }}>
      {value}
    </Typography>
    <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.58rem', color: 'text.secondary', letterSpacing: '0.3px' }}>
      {label}
    </Typography>
  </Box>
);

export default TimelineTab;
