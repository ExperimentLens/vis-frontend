import { Stack } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import ObservationWaterfall from './trace-observation-waterfall';
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
    <ResponsiveCardTable title="Observation Waterfall" showSettings={false} showFullScreenButton={false}>
      <ObservationWaterfall observations={observations} selectedId={selectedSpanId ?? defaultSpanId} onSelect={onSelectSpan} />
    </ResponsiveCardTable>
    {selectedObs && <SpanDetail obs={selectedObs} />}
  </Stack>
);

export default TimelineTab;
