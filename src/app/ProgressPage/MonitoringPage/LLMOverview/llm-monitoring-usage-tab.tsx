import {
  Box,
  Grid,
  Stack,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import {
  MONO,
  formatMs,
} from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

import { Bar, EmptyNote } from './chart-kit';
import DistributionChart from './distribution-chart';
import { BigNum, Td, Th, TruncMono } from './llm-monitoring-shared';
import TraceCountByHourChart from './trace-count-by-hour-chart';
import { useParams } from 'react-router';

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

                    <Typography variant="caption" sx={{ fontFamily: MONO, ml: 'auto' }}>
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
            showSettings={true}
            onDownload={onDownloadModelUsageCsv}
            downloadLabel="Download as CSV"
            downloadSecondaryText="Save model usage as CSV"
          >
            <BigNum
              value={rollupData.totalTokens ? rollupData.totalTokens.toLocaleString() : '—'}
              sub={`Total tokens · $${rollupData.totalCost.toFixed(4)} cost`}
            />

            {models.length === 0 ? (
              <EmptyNote>No generations.</EmptyNote>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <Th>Model</Th>
                    <Th align="right">Gens</Th>
                    <Th align="right">Tokens</Th>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {models.slice(0, 6).map(m => (
                    <TableRow key={m.model}>
                      <Td>
                        <TruncMono max={170}>{m.model}</TruncMono>
                      </Td>

                      <Td align="right">{m.generations}</Td>

                      <Td align="right">
                        <Box component="span" sx={{ fontFamily: MONO }}>
                          {m.tokens.toLocaleString()}
                        </Box>
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            showSettings={true}
            onDownload={onDownloadTraceLatencyCsv}
            downloadLabel="Download as CSV"
            downloadSecondaryText="Save latency percentiles as CSV"
          >
            {latencies.length === 0 ? (
              <EmptyNote>No latency data.</EmptyNote>
            ) : (
              <Box sx={{ overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <Th>Trace name</Th>
                      <Th align="right">#</Th>
                      <Th align="right">p50</Th>
                      <Th align="right">p90</Th>
                      <Th align="right">p95</Th>
                      <Th align="right">p99</Th>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {latencies.slice(0, 8).map(l => (
                      <TableRow key={l.name}>
                        <Td>
                          <TruncMono max={160}>{l.name}</TruncMono>
                        </Td>

                        <Td align="right">{l.count}</Td>

                        <Td align="right">
                          <Box component="span" sx={{ fontFamily: MONO }}>
                            {formatMs(l.p50)}
                          </Box>
                        </Td>

                        <Td align="right">
                          <Box component="span" sx={{ fontFamily: MONO }}>
                            {formatMs(l.p90)}
                          </Box>
                        </Td>

                        <Td align="right">
                          <Box component="span" sx={{ fontFamily: MONO }}>
                            {formatMs(l.p95)}
                          </Box>
                        </Td>

                        <Td align="right">
                          <Box component="span" sx={{ fontFamily: MONO }}>
                            {formatMs(l.p99)}
                          </Box>
                        </Td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </ResponsiveCardTable>
        </Grid>
      </Grid>
    </>
  );
}