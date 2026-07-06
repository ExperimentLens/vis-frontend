import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Handler } from 'vega-tooltip';

import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import {
  fetchSessionTraceDetails,
  selectSessionsMap,
} from '../../../../store/slices/observabilitySlice';
import {
  OBSERVABILITY_PROJECT_ID,
} from '../../../../shared/models/observability/agentic-conventions';
import {
  latencyByTraceName,
  modelUsageTable,
  observationsByTime,
  rollup,
  scoresTable,
  topTraceNames,
} from '../../../../shared/utils/observability-aggregates';
import InfoMessage from '../../../../shared/components/InfoMessage';
import LlmKpiStrip from './llm-kpi-strip';

import LlmMonitoringUsageTab from './llm-monitoring-usage-tab';
import LlmMonitoringQualityTab from './llm-monitoring-quality-tab';
import LlmMonitoringAgentsTab from './llm-monitoring-agents-tab';
type LlmOverviewTab = 'usage' | 'quality' | 'agents';

const LLM_TABS: Array<{ value: LlmOverviewTab; label: string }> = [
  { value: 'usage', label: 'Usage' },
  { value: 'quality', label: 'Quality' },
  { value: 'agents', label: 'Agents' },
];

const downloadCsv = (
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
  filename: string,
) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

export default function LlmMonitoringOverview() {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const [selectedTab, setSelectedTab] = useState<LlmOverviewTab>('usage');

  const tooltip = useMemo(
    () => new Handler({ sanitize: (v: unknown) => String(v) }).call,
    [],
  );

  const { experiment, workflows } = useAppSelector((s: RootState) => s.progressPage);
  const sessions = useAppSelector(selectSessionsMap);
  const experimentId = experiment.data?.id;

  const idKey = workflows.data
    .filter(w => w.status !== 'SCHEDULED')
    .map(w => w.id)
    .join(',');

  const workflowIds = useMemo(
    () => (idKey ? idKey.split(',') : []),
    [idKey],
  );

  useEffect(() => {
    if (!experimentId) return;

    workflowIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({
        projectId: OBSERVABILITY_PROJECT_ID,
        experimentId,
        workflowId: id,
      })),
    );
  }, [dispatch, experimentId, workflowIds]);

  const allDetails = useMemo(
    () => workflowIds.flatMap(id => sessions[id]?.details ?? []),
    [workflowIds, sessions],
  );

  const anyLoading = workflowIds.some(id => sessions[id]?.loading);
  const hasData = allDetails.length > 0;

  const r = useMemo(
    () => (hasData ? rollup(allDetails) : null),
    [hasData, allDetails],
  );

  const topTraces = useMemo(
    () => (hasData ? topTraceNames(allDetails, 5) : []),
    [hasData, allDetails],
  );

  const models = useMemo(
    () => (hasData ? modelUsageTable(allDetails) : []),
    [hasData, allDetails],
  );

  const scores = useMemo(
    () => (hasData ? scoresTable(allDetails) : []),
    [hasData, allDetails],
  );

  const timeSeries = useMemo(
    () => (hasData ? observationsByTime(allDetails) : []),
    [hasData, allDetails],
  );

  const latencies = useMemo(
    () => (hasData ? latencyByTraceName(allDetails) : []),
    [hasData, allDetails],
  );

  const totalObservations = useMemo(
    () => allDetails.reduce((sum, trace) => sum + trace.observations.length, 0),
    [allDetails],
  );

  const totalScores = useMemo(
    () => allDetails.reduce((sum, trace) => sum + trace.scores.length, 0),
    [allDetails],
  );

  const maxTopTraceCount = topTraces.length ? topTraces[0].count : 1;

  const obsSpec = useMemo(
    () => ({
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: timeSeries },
      mark: { type: 'line', point: true, interpolate: 'monotone', color: theme.palette.success.main },
      encoding: {
        x: { field: 'time', type: 'temporal', title: null },
        y: { field: 'count', type: 'quantitative', title: 'observations' },
        color: {
          field: 'level',
          type: 'nominal',
          scale: {
            domain: ['DEFAULT', 'ERROR', 'DEBUG', 'WARNING'],
            range: [
              theme.palette.success.main,
              theme.palette.error.main,
              theme.palette.text.secondary,
              theme.palette.warning.main,
            ],
          },
          legend: { orient: 'bottom', title: null },
        },
        tooltip: [
          { field: 'time', title: 'time', type: 'temporal', format: '%b %d, %H:%M' },
          { field: 'level', title: 'level' },
          { field: 'count', title: 'count' },
        ],
      },
    }) as Record<string, unknown>,
    [
      timeSeries,
      theme.palette.primary.main,
      theme.palette.error.main,
      theme.palette.text.secondary,
      theme.palette.warning.main,
    ],
  );

  const refresh = () => {
    if (!experimentId) return;

    workflowIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({
        projectId: OBSERVABILITY_PROJECT_ID,
        experimentId,
        workflowId: id,
      })),
    );
  };

  const handleDownloadTracesCsv = () => {
    downloadCsv(
      topTraces.map(t => ({
        trace: t.name,
        count: t.count,
      })),
      'traces.csv',
    );
  };

  const handleDownloadModelUsageCsv = () => {
    downloadCsv(
      models.map(m => ({
        model: m.model,
        generations: m.generations,
        tokens: m.tokens,
      })),
      'model-usage.csv',
    );
  };

  const handleDownloadScoresCsv = () => {
    downloadCsv(
      scores.map(s => ({
        name: s.name,
        count: s.count,
        average: s.avg,
        zeros: s.zeros ?? 0,
        ones: s.ones ?? 0,
      })),
      'scores.csv',
    );
  };

  const handleDownloadTraceLatencyCsv = () => {
    downloadCsv(
      latencies.map(l => ({
        traceName: l.name,
        count: l.count,
        p50: l.p50,
        p90: l.p90,
        p95: l.p95,
        p99: l.p99,
      })),
      'trace-latency-percentiles.csv',
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

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 44,
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_, value) => setSelectedTab(value as LlmOverviewTab)}
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 2,
            },
            '& .MuiTab-root': {
              minHeight: 44,
              px: 0,
              mr: 3,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
            },
          }}
        >
          {LLM_TABS.map(tab => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              disableRipple
            />
          ))}
        </Tabs>

        <Box sx={{ flexGrow: 1 }} />

        <Typography variant="caption" color="text.secondary">
          {workflowIds.length} session{workflowIds.length === 1 ? '' : 's'}
        </Typography>

        {anyLoading && <CircularProgress size={14} />}

        <Button
          size="small"
          startIcon={<RefreshRoundedIcon />}
          onClick={refresh}
          disabled={anyLoading}
        >
          Refresh
        </Button>
      </Stack>

      {!hasData && anyLoading && (
        <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 6, gap: 1.5 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">
            Fetching session traces…
          </Typography>
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

          {selectedTab === 'usage' && (
            <LlmMonitoringUsageTab
              details={allDetails}
              rollupData={r}
              topTraces={topTraces}
              models={models}
              timeSeries={timeSeries}
              latencies={latencies}
              maxTopTraceCount={maxTopTraceCount}
              totalObservations={totalObservations}
              obsSpec={obsSpec}
              tooltip={tooltip}
              onDownloadTracesCsv={handleDownloadTracesCsv}
              onDownloadModelUsageCsv={handleDownloadModelUsageCsv}
              onDownloadTraceLatencyCsv={handleDownloadTraceLatencyCsv}
            />
          )}

          {selectedTab === 'quality' && (
            <LlmMonitoringQualityTab
              details={allDetails}
              scores={scores}
              totalScores={totalScores}
              onDownloadScoresCsv={handleDownloadScoresCsv}
            />
          )}

          {selectedTab === 'agents' && (
            <LlmMonitoringAgentsTab details={allDetails} />
          )}
        </>
      )}
    </Stack>
  );
}