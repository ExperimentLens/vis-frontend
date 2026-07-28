import { Grid } from '@mui/material';

import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

import PerAgentProfileChart from './per-agent-profile-chart';
import CallFrequencyChart from './call-frequency-chart';

type AgentsTabProps = {
  details: TraceDetail[];
};

export default function LlmMonitoringAgentsTab({ details }: AgentsTabProps) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
        <PerAgentProfileChart details={details} />
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', mb: 1.5 }}>
        <CallFrequencyChart details={details} />
      </Grid>
    </Grid>
  );
}