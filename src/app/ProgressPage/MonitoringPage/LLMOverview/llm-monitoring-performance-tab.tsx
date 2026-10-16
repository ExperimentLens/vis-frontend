import { useMemo, useState } from 'react';
import { Chip, Grid } from '@mui/material';
import { useParams } from 'react-router';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { perAgentProfile } from '../../../../shared/utils/observability-aggregates';
import type ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import AllTracesTable from './all-traces-table';
import CallFrequencyChart from './call-frequency-chart';
import CostOverTimeChart from './cost-over-time-chart';
// import DistributionChart from './distribution-chart';
import ErrorsOverTimeChart from './errors-over-time-chart';
import LatencyOverTimeChart from './latency-over-time-chart';
import LatencyPercentilesChart from './latency-percentiles-chart';
import type { LatencyPercentiles } from './latency-percentiles-chart';
import LlmKpiStrip from './llm-kpi-strip';
import PerAgentProfileChart from './per-agent-profile-chart';
import TokensOverTimeChart from './tokens-over-time-chart';
import TraceCountByHourChart from './trace-count-by-hour-chart';

type Props = {
  details: TraceDetail[];
  isLoading: boolean;
  sessionCount: number;
  latencies: LatencyPercentiles[];
  tooltip: React.ComponentProps<typeof ResponsiveCardVegaLite>['tooltip'];
  runNameById: Record<string, string>;
  /** Set to false to hide the all-traces data grid (e.g. when it's shown on its own tab). Defaults to true. */
  showTracesTable?: boolean;
};

const CHART_HEIGHT = 350;

/**
 * Operational health from the traces: volume, then latency / tokens / cost / errors as
 * small multiples on a shared time axis, then where the time goes. The agent charts
 * only appear when more than one agent ran.
 */
export default function LlmMonitoringPerformanceTab({
  details,
  isLoading,
  sessionCount,
  latencies,
  tooltip,
  runNameById,
  showTracesTable = true,
}: Props) {
  const { experimentId } = useParams();
  const isMosaic = useAppSelector((s: RootState) => s.monitorPage.isMosaic);
  const [selectedTraceIds, setSelectedTraceIds] = useState<string[] | null>(null);
  const multiAgent = useMemo(() => perAgentProfile(details).length > 1, [details]);
  const half = { xs: 12, md: isMosaic ? 6 : 12 };

  return (
    <Grid container spacing={1.5} sx={{ pb: 1.5, flexShrink: 0 }}>
      <Grid size={{ xs: 12 }}>
        <LlmKpiStrip details={details} sessionCount={sessionCount} />
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', height: CHART_HEIGHT }}>
        <TraceCountByHourChart
          details={details}
          experimentId={experimentId}
          tooltip={tooltip}
          isLoading={isLoading}
          onSelectBucket={setSelectedTraceIds}
        />
      </Grid>

      <Grid size={half} sx={{ textAlign: 'left', height: CHART_HEIGHT }}>
        <LatencyOverTimeChart details={details} experimentId={experimentId} isLoading={isLoading} />
      </Grid>
      <Grid size={half} sx={{ textAlign: 'left', height: CHART_HEIGHT }}>
        <TokensOverTimeChart details={details} experimentId={experimentId} isLoading={isLoading} />
      </Grid>
      <Grid size={half} sx={{ textAlign: 'left', height: CHART_HEIGHT }}>
        <CostOverTimeChart details={details} experimentId={experimentId} isLoading={isLoading} />
      </Grid>
      <Grid size={half} sx={{ textAlign: 'left', height: CHART_HEIGHT }}>
        <ErrorsOverTimeChart details={details} experimentId={experimentId} isLoading={isLoading} />
      </Grid>

      <Grid size={half} sx={{ textAlign: 'left' }}>
        <LatencyPercentilesChart latencies={latencies} isLoading={isLoading} />
      </Grid>
      {/* <Grid size={half} sx={{ textAlign: 'left', height: CHART_HEIGHT }}>
        <DistributionChart details={details} experimentId={experimentId} isLoading={isLoading} />
      </Grid> */}

      {multiAgent && (
        <>
          <Grid size={half} sx={{ textAlign: 'left' }}>
            <PerAgentProfileChart details={details} />
          </Grid>
          <Grid size={half} sx={{ textAlign: 'left' }}>
            <CallFrequencyChart details={details} />
          </Grid>
        </>
      )}

      {showTracesTable && (
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
          {selectedTraceIds && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mb: 1 }}
              label={`${selectedTraceIds.length} of ${details.length} traces (from chart)`}
              onDelete={() => setSelectedTraceIds(null)}
            />
          )}
          <AllTracesTable details={details} experimentId={experimentId} selectedTraceIds={selectedTraceIds} runNameById={runNameById} />
        </Grid>
      )}
    </Grid>
  );
}
