import { useState } from 'react';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import SchemaRoundedIcon from '@mui/icons-material/SchemaRounded';
import type { Observation } from '../../../shared/models/observability/observation';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import InfoMessage from '../../../shared/components/InfoMessage';
import SegmentedToggle from '../../../shared/components/segmented-toggle';
import { colorForType } from './trace-observation-waterfall';
import SpanTree from './span-tree';
import TraceGraph from './trace-graph';
import SpanDetail from './span-detail';

type TimelineTabProps = {
  observations: Observation[];
  selectedSpanId: string | null;
  defaultSpanId: string | null;
  selectedObs?: Observation;
  onSelectSpan: (id: string | null) => void;
};

const TREE_VIEW_OPTIONS = [
  { value: 'list', icon: <ViewListRoundedIcon fontSize="small" />, tooltip: 'List' },
  { value: 'graph', icon: <SchemaRoundedIcon fontSize="small" />, tooltip: 'Graph' },
];

const TimelineTab = ({ observations, selectedSpanId, defaultSpanId, selectedObs, onSelectSpan }: TimelineTabProps) => {
  const [view, setView] = useState<'list' | 'graph'>('graph');
  const activeId = selectedSpanId ?? defaultSpanId;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      height="99%"
      width="100%"
      overflow="hidden"
    >
      <Box
        sx={{
          width: 340,
          minWidth: 280,
          maxWidth: 400,
          flexShrink: 0,
          height: '100%',
        }}
      >
        <ResponsiveCardTable
          title="Trace"
          showSettings={false}
          showFullScreenButton={false}
          noPadding
          headerActions={
            <SegmentedToggle
              size="small"
              value={view}
              onChange={value => setView(value as 'list' | 'graph')}
              options={TREE_VIEW_OPTIONS}
              aria-label="Trace view"
            />
          }
        >
          <Stack spacing={0} sx={{ height: '100%' }}>
            {observations.length > 0 && (
              <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
                <TimelineSummary observations={observations} />
              </Box>
            )}
            <Box sx={{ flex: 1, overflow: 'auto', px: view === 'list' ? 0.75 : 0, pb: 1 }}>
              {view === 'list' ? (
                <SpanTree observations={observations} selectedId={activeId} onSelect={onSelectSpan} />
              ) : (
                <TraceGraph observations={observations} selectedId={activeId} onSelect={onSelectSpan} />
              )}
            </Box>
          </Stack>
        </ResponsiveCardTable>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
        <ResponsiveCardTable title="Selected Observation" showSettings={false} showFullScreenButton={false}>
          {selectedObs ? (
            <SpanDetail obs={selectedObs} />
          ) : (
            <InfoMessage
              message="Select a span from the trace to inspect its input, output and metadata."
              type="info"
              icon={<TouchAppRoundedIcon sx={{ fontSize: 32, color: 'info.main' }} />}
              fullHeight
            />
          )}
        </ResponsiveCardTable>
      </Box>
    </Stack>
  );
};

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
    <Typography component="span" sx={{ fontSize: '0.62rem', fontWeight: 700, color }}>
      {value}
    </Typography>
    <Typography component="span" sx={{ fontSize: '0.58rem', color: 'text.secondary'}}>
      {label}
    </Typography>
  </Box>
);

export default TimelineTab;
