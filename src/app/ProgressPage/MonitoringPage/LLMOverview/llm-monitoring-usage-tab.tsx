import {
  Box,
  Grid,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import {
  formatMs,
} from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

import { Bar, EmptyNote } from './chart-kit';
import DistributionChart from './distribution-chart';
import { BigNum, TruncMono } from './llm-monitoring-shared';
import TraceCountByHourChart from './trace-count-by-hour-chart';
import { useParams } from 'react-router';
import { styled } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
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

type ModelUsageRow = {
  id: string;
  model: string;
  generations: number;
  tokens: number;
};


const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  '&.MuiDataGrid-root': {
    border: 'none',
    borderRadius: '0 0 12px 12px',
  },

  '& .MuiDataGrid-columnHeaders': {
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },

  '& .MuiDataGrid-columnHeader': {
    backgroundColor: theme.palette.customGrey.main,
    borderRight: `1px solid ${theme.palette.divider}`,
  },

  '& .MuiDataGrid-scrollbarFiller': {
    backgroundColor: theme.palette.customGrey.main,
  },

  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'visible',
  },

  '& .MuiDataGrid-cell': {
    borderRight: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },

  '& .MuiDataGrid-row:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '& .MuiDataGrid-row.Mui-selected': {
    backgroundColor: `${theme.palette.primary.light}40`,

    '&:hover': {
      backgroundColor: `${theme.palette.primary.light}60`,
    },
  },

  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },

  '& .MuiDataGrid-selectedRowCount': {
    visibility: 'hidden',
  },
}));

type UsageTabProps = {
  details: TraceDetail[];
  isLoading: boolean;
  rollupData: {
    traceCount: number;
    totalTokens: number;
    totalCost: number;
  };
  topTraces: Array<{
    name: string;
    count: number;
  }>;
  models: Array<{
    model: string;
    generations: number;
    tokens: number;
  }>;
  timeSeries: unknown[];
  latencies: Array<{
    name: string;
    count: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  }>;
  maxTopTraceCount: number;
  totalObservations: number;
  obsSpec: Record<string, unknown>;
  tooltip: React.ComponentProps<typeof ResponsiveCardVegaLite>['tooltip'];
  onDownloadTracesCsv: () => void;
  onDownloadModelUsageCsv: () => void;
  onDownloadTraceLatencyCsv: () => void;
};

export default function LlmMonitoringUsageTab({
  details,
  isLoading,
  rollupData,
  topTraces,
  models,
  timeSeries,
  latencies,
  maxTopTraceCount,
  totalObservations,
  obsSpec,
  tooltip,
  onDownloadTracesCsv,
  onDownloadModelUsageCsv,
  onDownloadTraceLatencyCsv,
}: UsageTabProps) {
  const theme = useTheme();
  const { experimentId } = useParams();

  const modelUsageColumns: GridColDef[] = [
    {
      field: 'model',
      headerName: 'Model',
      flex: 1,
      minWidth: 220,
      headerAlign: 'left',
      align: 'left',
      sortable: true,
      resizable: false,
      renderCell: params => (
          String(params.value ?? '')
      ),
    },
    {
      field: 'generations',
      headerName: 'Gens',
      width: 120,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      sortable: true,
      resizable: false,
    },
    {
      field: 'tokens',
      headerName: 'Tokens',
      width: 160,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
      sortable: true,
      resizable: false,
      renderCell: params => (
        <Box component="span">
          {Number(params.value ?? 0).toLocaleString()}
        </Box>
      ),
    },
  ];

  const modelUsageRows: ModelUsageRow[] = models
    .slice(0, 6)
    .map((model, index) => ({
      id: `${model.model}-${index}`,
      model: model.model,
      generations: model.generations,
      tokens: model.tokens,
    }));

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
        <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left' }}>
          <ResponsiveCardTable
            title="Traces"
            showSettings={true}
            onDownload={onDownloadTracesCsv}
            downloadLabel="Download as CSV"
            downloadSecondaryText="Save traces as CSV"
          >
            <BigNum
              value={rollupData.traceCount.toLocaleString()}
              sub="Total traces tracked"
            />

            {topTraces.length === 0 ? (
              <EmptyNote>No traces.</EmptyNote>
            ) : (
              <Stack spacing={0.5}>
                {topTraces.map(t => (
                  <Stack key={t.name} direction="row" alignItems="center" spacing={1}>
                    <TruncMono max={130}>{t.name}</TruncMono>

                    <Bar
                      value={t.count / maxTopTraceCount}
                      color={theme.palette.primary.main}
                      width={100}
                    />

                    <Typography variant="caption" sx={{ml: 'auto' }}>
                      {t.count}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </ResponsiveCardTable>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left' }}>
          <ResponsiveCardTable
            title="Model usage"
            showSettings
            onDownload={onDownloadModelUsageCsv}
            downloadLabel="Download as CSV"
            downloadSecondaryText="Save model usage as CSV"
            noPadding
          >
            <Box sx={{ px: 2, pt: 2, pb: modelUsageRows.length > 0 ? 1.5 : 2 }}>
              <BigNum
                value={
                  rollupData.totalTokens
                    ? rollupData.totalTokens.toLocaleString()
                    : '—'
                }
                sub={`Total tokens · $${rollupData.totalCost.toFixed(4)} cost`}
              />
            </Box>
              
            {modelUsageRows.length === 0 ? (
              <Box sx={{ px: 2, pb: 2 }}>
                <EmptyNote>No generations.</EmptyNote>
              </Box>
            ) : (
              <StyledDataGrid
                autoHeight
                hideFooter
                disableColumnMenu
                disableColumnResize
                disableRowSelectionOnClick
                rows={modelUsageRows}
                columns={modelUsageColumns}
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
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', height: 350 }}>
          <TraceCountByHourChart details={details} experimentId={experimentId} tooltip={tooltip} isLoading={isLoading} />
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