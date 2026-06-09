import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  useTheme,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { RootState } from '../../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { fetchSessionTraceDetails, selectSessionsMap } from '../../../../../store/slices/observabilitySlice';
import { setHoveredWorkflow } from '../../../../../store/slices/monitorPageSlice';
import { OBSERVABILITY_PROJECT_ID } from '../../../../../shared/models/observability/agentic-conventions';
import { Handler } from 'vega-tooltip';
import { rollup } from '../../../../../shared/utils/observability-aggregates';
import type { ExperimentRollup } from '../../../../../shared/utils/observability-aggregates';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import ObservationWaterfall from '../../../../Tasks/Observability/trace-observation-waterfall';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../../shared/components/responsive-card-vegalite';
import { EmptyNote } from '../../LLMOverview/chart-kit';
import { alignByQuestion } from './trajectory-alignment';
import Loader from '../../../../../shared/components/loader';
import VerdictMatrix from './verdict-matrix';
import PerTaskAnalysis from './per-task-analysis';
import { exportElementToPng } from '../../../../../shared/utils/export-png';

const FALLBACK_COLORS = ['#3766AF', '#6BBC8C', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];

const SUMMARY_METRICS: ReadonlyArray<{ key: keyof ExperimentRollup; label: string; scale: number }> = [
  { key: 'avgLatencyMs', label: 'Avg latency (ms)', scale: 1 },
  { key: 'totalTokens', label: 'Tokens', scale: 1 },
  { key: 'judgePassRate', label: 'Judge pass (%)', scale: 100 },
  { key: 'errorRate', label: 'Errors (%)', scale: 100 },
];

export default function LlmTrajectoryDiff() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { workflowsTable } = useAppSelector((s: RootState) => s.monitorPage);
  const selectedExecutionsView = useAppSelector((s: RootState) => s.monitorPage.selectedExecutionsView);
  const isMosaic = useAppSelector((s: RootState) => s.monitorPage.isMosaic);
  const { experiment, workflows } = useAppSelector((s: RootState) => s.progressPage);
  const sessions = useAppSelector(selectSessionsMap);

  const experimentId = experiment.data?.id;
  const selectedWorkflows = workflowsTable.selectedWorkflows;
  const workflowColors = workflowsTable.workflowColors;

  const idKey = selectedWorkflows.join(',');
  const runIds = useMemo(() => (idKey ? idKey.split(',') : []), [idKey]);
  const runNameById = useMemo(
    () => Object.fromEntries(workflows.data.map(w => [w.id, w.name ?? w.id])),
    [workflows.data],
  );

  useEffect(() => {
    if (!experimentId) return;
    runIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({ projectId: OBSERVABILITY_PROJECT_ID, experimentId, workflowId: id })),
    );
  }, [experimentId, idKey, runIds, dispatch]);

  const detailsByRun = useMemo(
    () => Object.fromEntries(runIds.map(id => [id, sessions[id]?.details ?? []])),
    [runIds, sessions],
  );

  const aligned = useMemo(() => alignByQuestion(detailsByRun), [detailsByRun]);
  const [questionIdx, setQuestionIdx] = useState(0);

  useEffect(() => setQuestionIdx(0), [idKey]);

  const colorOf = (runId: string, i: number) => workflowColors[runId] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  const colorById = Object.fromEntries(runIds.map((id, i) => [id, colorOf(id, i)]));
  const baseline = runIds[0];
  const anyLoading = runIds.some(id => sessions[id]?.loading);
  const hasAny = runIds.some(id => (sessions[id]?.details?.length ?? 0) > 0);

  const hoveredWorkflowId = workflowsTable.hoveredWorkflowId;

  // SUMMARY 2x2 charts — one card per metric. Hooks declared up here so they
  // always run before the early returns below.
  const summaryTooltip = useMemo(
    () => new Handler({ sanitize: (v: unknown) => String(v) }).call,
    [],
  );

  const summaryColor = useMemo(() => ({
    domain: runIds,
    range: runIds.map((id, i) => workflowColors[id] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
  }), [runIds, workflowColors]);

  const lastHoverRef = useRef<string | null>(null);
  const signalListeners = useMemo(() => ({
    hover: (_name: string, value: unknown) => {
      const v = value as { id?: string | string[] } | null | undefined;
      const next =
        v && v.id
          ? (Array.isArray(v.id) ? v.id[0] : v.id) ?? null
          : null;

      if (next !== lastHoverRef.current) {
        lastHoverRef.current = next;
        dispatch(setHoveredWorkflow(next));
      }
    },
  }), [dispatch]);

  const summaryDatasets = useMemo(() => {
    const rolls: Record<string, ExperimentRollup> = {};

    runIds.forEach(id => { rolls[id] = rollup(detailsByRun[id] ?? []); });
    const out: Record<string, Array<{ id: string; runName: string; value: number }>> = {};

    SUMMARY_METRICS.forEach(m => {

      out[m.key] = runIds
        .map(id => {
          const raw = rolls[id]?.[m.key] as number | null | undefined;

          if (raw === null || raw === undefined) return null;
          const v = raw * m.scale;

          return { id, runName: runNameById[id] ?? id, value: Number(v.toFixed(2)) };
        })
        .filter((r): r is { id: string; runName: string; value: number } => r !== null);
    });

    return out;
  }, [runIds, detailsByRun, runNameById]);

  const trajectoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleDownloadTrajectoryPng = async (runId: string) => {
    const element = trajectoryRefs.current[runId];
    if (!element) return;

    await exportElementToPng(
      element,
      `trajectory-${runNameById[runId] ?? runId}-${new Date().toISOString().split('T')[0]}.png`,
      theme.palette.background.paper,
    );
  };

  if (!hasAny && anyLoading) {
    return (
      <Loader />
    )
  }

  if (!hasAny) {
    return (
        <InfoMessage 
          message="No traces found for the selected workflows." 
          type="info" 
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />} 
          fullHeight 
        />
    );
  }

  const selectedQ = aligned.length ? aligned[Math.min(questionIdx, aligned.length - 1)] : undefined;

  return (
    <Stack spacing={1.5} sx={{ p: 1.5 }}>
      {/* SUMMARY — bar charts per metric, layout follows Mosaic/Stacked. Hover syncs with the workflow table. */}
      {selectedExecutionsView === 'summary' && (
        <Grid container spacing={1.5}>
          {SUMMARY_METRICS.map(m => {
            const data = summaryDatasets[m.key] ?? [];
            const yMax = data.length ? Math.max(...data.map(d => d.value)) * 1.1 : 1;
            
            // Cap the bar width so a single (or few) selected workflow doesn't render a
            // giant bar. Band-scale padding is width-independent, so padding a lone bar
            // makes it match the width it would have when ~2 bars are present.
            const barCount = data.length;
            const barPaddingOuter = Math.max(0.05, (2.1 - barCount) / 2);
            
            const spec = {
              $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
              data: { values: data },
              params: [
                { name: 'hover', select: { type: 'point', fields: ['id'], on: 'mouseover', clear: 'mouseout' } },
              ],
              mark: { type: 'bar', cornerRadiusEnd: 3 },
              encoding: {
                x: {
                  field: 'id',
                  type: 'ordinal',
                  sort: runIds,
                  scale: { paddingInner: 0.2, paddingOuter: barPaddingOuter },
                  axis: { labels: false, ticks: false, title: null, domain: false },
                },
                y: {
                  field: 'value',
                  type: 'quantitative',
                  axis: { title: null },
                  scale: { domain: [0, yMax || 1] },
                },
                color: { field: 'id', type: 'nominal', scale: summaryColor, legend: null },
                opacity: hoveredWorkflowId ? {
                  condition: { test: `datum.id === '${hoveredWorkflowId}'`, value: 1 },
                  value: 0.35,
                } : undefined,
                strokeWidth: hoveredWorkflowId ? {
                  condition: { test: `datum.id === '${hoveredWorkflowId}'`, value: 2 },
                  value: 0,
                } : undefined,
                stroke: hoveredWorkflowId ? {
                  condition: { test: `datum.id === '${hoveredWorkflowId}'`, value: '#000' },
                  value: 'transparent',
                } : undefined,
                tooltip: [
                  { field: 'runName', type: 'nominal', title: 'workflow' },
                  { field: 'value', type: 'quantitative', title: m.label, format: ',.2f' },
                ],
              },
            } as Record<string, unknown>;

            return (
              <Grid
                key={m.key as string}
                size={{ xs: isMosaic ? 6 : 12 }}
                sx={{ textAlign: 'left' }}
              >
                <ResponsiveCardVegaLite
                  title={m.label}
                  spec={spec}
                  actions={false}
                  isStatic={false}
                  tooltip={summaryTooltip}
                  signalListeners={signalListeners}
                  sx={{ width: '100%', maxWidth: '100%' }}
                  minHeight={220}
                  showInfoMessage={data.length === 0}
                  showSettings={true}
                  infoMessage={
                    <InfoMessage
                      message={`No ${m.label.toLowerCase()} data.`}
                      type="info"
                      icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
                      fullHeight
                    />
                  }
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Question selector — TIMELINE / VERDICTS */}
      {(selectedExecutionsView === 'timeline' || selectedExecutionsView === 'verdicts') && (
      <FormControl size="small" sx={{ maxWidth: 560 }}>
        <InputLabel id="traj-q">Aligned question</InputLabel>
        <Select
          labelId="traj-q"
          label="Aligned question"
          value={aligned.length ? Math.min(questionIdx, aligned.length - 1) : ''}
          onChange={e => setQuestionIdx(Number(e.target.value))}
        >
          {aligned.map((aq, i) => (
            <MenuItem key={aq.question} value={i} sx={{ fontSize: '0.78rem' }}>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 440 }}>
                {aq.question}
              </Box>
              <Chip size="small" label={`${aq.runCount}/${runIds.length}`} sx={{ ml: 1, height: 16, fontSize: '0.55rem' }} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      )}

      {selectedQ && selectedExecutionsView === 'timeline' && (
        <>
          {/* Side-by-side trajectories — layout follows Mosaic/Stacked + run count */}
          <Grid container spacing={1.5}>
            {runIds.map((id, i) => {
              const trace = selectedQ.byRun[id];
              const mosaicSize = runIds.length >= 3 ? 4 : 6;
              const size = isMosaic ? mosaicSize : 12;

              return (
                <Grid key={id} size={{ xs: 12, md: size }} sx={{ textAlign: 'left' }}>
                  <ResponsiveCardTable 
                    title={runNameById[id] ?? id} 
                    details={id === baseline ? 'baseline' : 'execution'}
                    showDownloadButton={true}
                    onDownload={() => handleDownloadTrajectoryPng(id)}
                    downloadLabel="Download as PNG"
                  >
                    <Box 
                      ref={(el: HTMLDivElement | null) => { if (el) trajectoryRefs.current[id] = el; }}
                      sx={{ borderTop: `2px solid ${colorOf(id, i)}`, pt: 1 }}
                    >
                      {trace
                        ? <ObservationWaterfall observations={trace.observations} />
                        : <EmptyNote>No trace for this question in this run.</EmptyNote>}
                    </Box>
                  </ResponsiveCardTable>
                </Grid>
              );
            })}
          </Grid>

          {/* Per-task analysis — inline bars, metric toggle, regression sort */}
          <PerTaskAnalysis byRun={selectedQ.byRun} runIds={runIds} runNameById={runNameById} colorById={colorById} baselineId={baseline} />
        </>
      )}

      {selectedQ && selectedExecutionsView === 'verdicts' && (
        <VerdictMatrix
          byRun={selectedQ.byRun}
          runIds={runIds}
          runNameById={runNameById}
          colorById={colorById}
          baselineId={baseline}
        />
      )}
    </Stack>
  );
}
