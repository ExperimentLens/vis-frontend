import { useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Handler } from 'vega-tooltip';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { fetchSessionTraceDetails, selectSessionsMap } from '../../../../store/slices/observabilitySlice';
import { MONO, OBSERVABILITY_PROJECT_ID, formatMs } from '../../../../shared/models/observability/agentic-conventions';
import {
  latencyByTraceName,
  modelUsageTable,
  observationsByTime,
  rollup,
  scoresTable,
  topTraceNames,
} from '../../../../shared/utils/observability-aggregates';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { Bar, EmptyNote } from './chart-kit';
import LlmKpiStrip from './llm-kpi-strip';
import VerdictPassRateChart from './verdict-passrate-chart';
import PerAgentProfileChart from './per-agent-profile-chart';
import CallFrequencyChart from './call-frequency-chart';
import DistributionChart from './distribution-chart';

const Th = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <TableCell align={align} sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary', whiteSpace: 'nowrap', py: 0.75 }}>
    {children}
  </TableCell>
);

const Td = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <TableCell align={align} sx={{ fontSize: '0.74rem', whiteSpace: 'nowrap', py: 0.5 }}>
    {children}
  </TableCell>
);

const TruncMono = ({ children, max = 160 }: { children: string; max?: number }) => (
  <Box component="span" sx={{ fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: max, display: 'inline-block', verticalAlign: 'bottom' }} title={children}>
    {children}
  </Box>
);

const BigNum = ({ value, sub }: { value: string; sub: string }) => (
  <Box sx={{ mb: 1 }}>
    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{sub}</Typography>
  </Box>
);

export default function LlmMonitoringOverview() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const tooltip = useMemo(() => new Handler({ sanitize: (v: unknown) => String(v) }).call, []);
  const { experiment, workflows } = useAppSelector((s: RootState) => s.progressPage);
  const sessions = useAppSelector(selectSessionsMap);
  const experimentId = experiment.data?.id;

  const idKey = workflows.data
    .filter(w => w.status !== 'SCHEDULED')
    .map(w => w.id)
    .join(',');
  const workflowIds = useMemo(() => (idKey ? idKey.split(',') : []), [idKey]);

  useEffect(() => {
    if (!experimentId) return;
    workflowIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({ projectId: OBSERVABILITY_PROJECT_ID, experimentId, workflowId: id })),
    );
  }, [experimentId, idKey, workflowIds, dispatch]);

  const allDetails = useMemo(
    () => workflowIds.flatMap(id => sessions[id]?.details ?? []),
    [workflowIds, sessions],
  );

  const anyLoading = workflowIds.some(id => sessions[id]?.loading);
  const hasData = allDetails.length > 0;

  const refresh = () => {
    if (!experimentId) return;
    workflowIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({ projectId: OBSERVABILITY_PROJECT_ID, experimentId, workflowId: id })),
    );
  };

  if (workflowIds.length === 0) {
    return (
      <InfoMessage
        message="No completed workflows to aggregate traces from yet."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  const r = hasData ? rollup(allDetails) : null;
  const topTraces = hasData ? topTraceNames(allDetails, 5) : [];
  const models = hasData ? modelUsageTable(allDetails) : [];
  const scores = hasData ? scoresTable(allDetails) : [];
  const timeSeries = hasData ? observationsByTime(allDetails) : [];
  const latencies = hasData ? latencyByTraceName(allDetails) : [];
  const totalObservations = allDetails.reduce((s, t) => s + t.observations.length, 0);
  const totalScores = allDetails.reduce((s, t) => s + t.scores.length, 0);
  const maxTopTraceCount = topTraces.length ? topTraces[0].count : 1;

  const obsSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: timeSeries },
    mark: { type: 'line', point: true, interpolate: 'monotone' },
    encoding: {
      x: { field: 'time', type: 'temporal', title: null },
      y: { field: 'count', type: 'quantitative', title: 'observations' },
      color: {
        field: 'level',
        type: 'nominal',
        scale: {
          domain: ['DEFAULT', 'ERROR', 'DEBUG', 'WARNING'],
          range: [theme.palette.primary.main, theme.palette.error.main, theme.palette.text.secondary, theme.palette.warning.main],
        },
        legend: { orient: 'bottom', title: null },
      },
      tooltip: [
        { field: 'time', title: 'time', type: 'temporal', format: '%b %d, %H:%M' },
        { field: 'level', title: 'level' },
        { field: 'count', title: 'count' },
      ],
    },
  } as Record<string, unknown>;

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <HubRoundedIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Agentic Overview</Typography>
        <Typography variant="caption" color="text.secondary">
          {workflowIds.length} session{workflowIds.length === 1 ? '' : 's'}
        </Typography>
        {anyLoading && <CircularProgress size={14} />}
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={anyLoading}>
          Refresh
        </Button>
      </Stack>

      {!hasData && anyLoading && (
        <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 6, gap: 1.5 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">Fetching session traces…</Typography>
        </Stack>
      )}

      {!hasData && !anyLoading && (
        <InfoMessage
          message="No traces found for this experiment's sessions."
          type="info"
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          fullHeight
        />
      )}

      {hasData && r && (
        <>
          <LlmKpiStrip details={allDetails} sessionCount={workflowIds.length} />

          {/* Top row: Traces / Model usage / Scores */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'left' }}>
              <ResponsiveCardTable title="Traces" showSettings={false}>
                <BigNum value={r.traceCount.toLocaleString()} sub="Total traces tracked" />
                {topTraces.length === 0 ? <EmptyNote>No traces.</EmptyNote> : (
                  <Stack spacing={0.5}>
                    {topTraces.map(t => (
                      <Stack key={t.name} direction="row" alignItems="center" spacing={1}>
                        <TruncMono max={130}>{t.name}</TruncMono>
                        <Bar value={t.count / maxTopTraceCount} color={theme.palette.primary.main} width={100} />
                        <Typography variant="caption" sx={{ fontFamily: MONO, ml: 'auto' }}>{t.count}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </ResponsiveCardTable>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'left' }}>
              <ResponsiveCardTable title="Model usage" showSettings={false}>
                <BigNum
                  value={r.totalTokens ? r.totalTokens.toLocaleString() : '—'}
                  sub={`Total tokens · $${r.totalCost.toFixed(4)} cost`}
                />
                {models.length === 0 ? <EmptyNote>No generations.</EmptyNote> : (
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
                          <Td><TruncMono max={170}>{m.model}</TruncMono></Td>
                          <Td align="right">{m.generations}</Td>
                          <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{m.tokens.toLocaleString()}</Box></Td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ResponsiveCardTable>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'left' }}>
              <ResponsiveCardTable title="Scores" showSettings={false}>
                <BigNum value={totalScores.toLocaleString()} sub="Total scores tracked" />
                {scores.length === 0 ? <EmptyNote>No scores.</EmptyNote> : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <Th>Name</Th>
                        <Th align="right">#</Th>
                        <Th align="right">Avg</Th>
                        <Th align="right">0</Th>
                        <Th align="right">1</Th>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scores.slice(0, 6).map(s => (
                        <TableRow key={s.name}>
                          <Td><TruncMono max={140}>{s.name}</TruncMono></Td>
                          <Td align="right">{s.count}</Td>
                          <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{s.avg.toFixed(2)}</Box></Td>
                          <Td align="right">{s.zeros || '—'}</Td>
                          <Td align="right">{s.ones || '—'}</Td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ResponsiveCardTable>
            </Grid>
          </Grid>

          {/* Quality, latency & frequency — all derived from the trace payload you already fetch */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left' }}><VerdictPassRateChart details={allDetails} /></Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left' }}><PerAgentProfileChart details={allDetails} /></Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'left' }}><CallFrequencyChart details={allDetails} /></Grid>
            <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}><DistributionChart details={allDetails} /></Grid>
          </Grid>

          {/* Bottom row: Observations by time / Trace latency percentiles */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ textAlign: 'left' }}>
              {timeSeries.length === 0 ? (
                <ResponsiveCardTable title="Observations by time" showSettings={false}>
                  <EmptyNote>No observations to plot.</EmptyNote>
                </ResponsiveCardTable>
              ) : (
                <ResponsiveCardVegaLite
                  title="Observations by time"
                  details={`${totalObservations.toLocaleString()} observations tracked`}
                  spec={obsSpec}
                  actions={false}
                  isStatic={false}
                  tooltip={tooltip}
                  sx={{ width: '100%', maxWidth: '100%' }}
                />
              )}
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }} sx={{ textAlign: 'left' }}>
              <ResponsiveCardTable title="Trace latency percentiles" showSettings={false}>
                {latencies.length === 0 ? <EmptyNote>No latency data.</EmptyNote> : (
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
                            <Td><TruncMono max={160}>{l.name}</TruncMono></Td>
                            <Td align="right">{l.count}</Td>
                            <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{formatMs(l.p50)}</Box></Td>
                            <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{formatMs(l.p90)}</Box></Td>
                            <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{formatMs(l.p95)}</Box></Td>
                            <Td align="right"><Box component="span" sx={{ fontFamily: MONO }}>{formatMs(l.p99)}</Box></Td>
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
      )}
    </Stack>
  );
}
