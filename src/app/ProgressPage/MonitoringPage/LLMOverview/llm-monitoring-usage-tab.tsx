import { useState } from 'react';
import {
  Box,
  Grid,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import {
  formatMs,
} from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

import { EmptyNote } from './chart-kit';
import DistributionChart from './distribution-chart';
import { StyledDataGrid } from './llm-monitoring-shared';
import TraceCountByHourChart from './trace-count-by-hour-chart';
import AllTracesTable from './all-traces-table';
import { useParams } from 'react-router';
import type { GridColDef } from '@mui/x-data-grid';

type LatencyPercentileRow = {
  id: string;
  name: string;
  count: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
};

type UsageTabProps = {
  details: TraceDetail[];
  isLoading: boolean;
  latencies: Array<{
    name: string;
    count: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  }>;
  timeSeries: unknown[];
  totalObservations: number;
  obsSpec: Record<string, unknown>;
  tooltip: React.ComponentProps<typeof ResponsiveCardVegaLite>['tooltip'];
  onDownloadTraceLatencyCsv: () => void;
};

export default function LlmMonitoringUsageTab({
  details,
  isLoading,
  latencies,
  timeSeries,
  totalObservations,
  obsSpec,
  tooltip,
  onDownloadTraceLatencyCsv,
}: UsageTabProps) {
  const { experimentId } = useParams();
  const [selectedTraceIds, setSelectedTraceIds] = useState<string[] | null>(null);

  const latencyRows: LatencyPercentileRow[] = latencies
    .slice(0, 8)
    .map((latency, index) => ({
      id: `${latency.name}-${index}`,
      name: latency.name,
      count: latency.count,
      p50: latency.p50,
      p90: latency.p90,
      p95: latency.p95,
      p99: latency.p99,
    }));

  const latencyColumns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Trace name',
      flex: 1,
      minWidth: 180,
      headerAlign: 'left',
      align: 'left',
      sortable: true,
      renderCell: params => (
        String(params.value ?? '')
      ),
    },
    {
      field: 'count',
      headerName: '#',
      width: 80,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
    },
    {
      field: 'p50',
      headerName: 'p50',
      width: 110,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      renderCell: params => (
        <Box component="span">
          {formatMs(Number(params.value))}
        </Box>
      ),
    },
    {
      field: 'p90',
      headerName: 'p90',
      width: 110,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      renderCell: params => (
        <Box component="span">
          {formatMs(Number(params.value))}
        </Box>
      ),
    },
    {
      field: 'p95',
      headerName: 'p95',
      width: 110,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      renderCell: params => (
        <Box component="span">
          {formatMs(Number(params.value))}
        </Box>
      ),
    },
    {
      field: 'p99',
      headerName: 'p99',
      width: 110,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      renderCell: params => (
        <Box component="span">
          {formatMs(Number(params.value))}
        </Box>
      ),
    },
  ];

  return (
    <>
    <Grid container spacing={1.5}>
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
          <AllTracesTable
            details={details}
            experimentId={experimentId}
            selectedTraceIds={selectedTraceIds}
            onClearSelection={() => setSelectedTraceIds(null)}
          />
        </Grid>
      </Grid>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', height: 350 }}>
          <TraceCountByHourChart
            details={details}
            experimentId={experimentId}
            tooltip={tooltip}
            isLoading={isLoading}
            onSelectBucket={setSelectedTraceIds}
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left', height: 300 }}>
          <DistributionChart details={details} experimentId={experimentId} isLoading={isLoading} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left', height: 300 }}>
          <ResponsiveCardVegaLite
            title="Observations by time"
            details={
              timeSeries.length > 0
                ? `${totalObservations.toLocaleString()} observations tracked`
                : 'No observations tracked.'
            }
            spec={timeSeries.length > 0 ? obsSpec : {}}
            actions={false}
            isStatic={false}
            tooltip={tooltip}
            showSettings={timeSeries.length > 0}
            showInfoMessage={timeSeries.length === 0}
            infoMessage={
              <InfoMessage
                message="No observations to plot."
                icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
                type="info"
                fullHeight
              />
            }
            maxHeight={240}
            aspectRatio={1.7}
            loading={isLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', mb: 1.5 }}>
          <ResponsiveCardTable
            title="Trace latency percentiles"
            showSettings
            onDownload={onDownloadTraceLatencyCsv}
            downloadLabel="Download as CSV"
            downloadSecondaryText="Save latency percentiles as CSV"
            noPadding
          >
            {latencies.length === 0 ? (
              <EmptyNote>No latency data.</EmptyNote>
            ) : (
              <StyledDataGrid
                autoHeight
                hideFooter
                disableRowSelectionOnClick
                disableColumnResize
                disableColumnMenu
                rows={latencyRows}
                columns={latencyColumns}
                rowHeight={44}
                columnHeaderHeight={44}
                sx={{
                  width: '100%',

                  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                    outline: 'none',
                  },

                  '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within':
                    {
                      outline: 'none',
                    },
                }}
              />
            )}
          </ResponsiveCardTable>
        </Grid>
      </Grid>

      
    </>
  );
}
