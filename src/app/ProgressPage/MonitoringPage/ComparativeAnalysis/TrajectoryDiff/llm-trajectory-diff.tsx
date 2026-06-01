import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { RootState } from '../../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { fetchSessionTraceDetails, selectSessionsMap } from '../../../../../store/slices/observabilitySlice';
import { setHoveredWorkflow } from '../../../../../store/slices/monitorPageSlice';
import { MONO, OBSERVABILITY_PROJECT_ID, formatMs } from '../../../../../shared/models/observability/agentic-conventions';
import { Handler } from 'vega-tooltip';
import { rollup } from '../../../../../shared/utils/observability-aggregates';
import type { ExperimentRollup } from '../../../../../shared/utils/observability-aggregates';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import ObservationWaterfall, { colorForType } from '../../../WorkflowTab/SelectedItemView/trace-observation-waterfall';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../../shared/components/responsive-card-vegalite';
import { EmptyNote } from '../../LLMOverview/chart-kit';
import { alignByQuestion, alignTasks, alignVerdicts } from './trajectory-alignment';
import type { AlignedTaskCell } from './trajectory-alignment';

const FALLBACK_COLORS = ['#3766AF', '#6BBC8C', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];

const SUMMARY_METRICS: ReadonlyArray<{ key: keyof ExperimentRollup; label: string; scale: number }> = [
  { key: 'avgLatencyMs', label: 'Avg latency (ms)', scale: 1 },
  { key: 'totalTokens', label: 'Tokens', scale: 1 },
  { key: 'judgePassRate', label: 'Judge pass (%)', scale: 100 },
  { key: 'errorRate', label: 'Errors (%)', scale: 100 },
];

type CellAlign = 'left' | 'right' | 'center';

const Th = ({ children, align, colSpan }: { children: React.ReactNode; align?: CellAlign; colSpan?: number }) => (
  <TableCell align={align} colSpan={colSpan} sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary', whiteSpace: 'nowrap', py: 0.75 }}>
    {children}
  </TableCell>
);

const Td = ({ children, align, colSpan }: { children: React.ReactNode; align?: CellAlign; colSpan?: number }) => (
  <TableCell align={align} colSpan={colSpan} sx={{ fontSize: '0.74rem', whiteSpace: 'nowrap', py: 0.5 }}>
    {children}
  </TableCell>
);

const DeltaText = ({ delta, lowerBetter, format }: { delta: number; lowerBetter: boolean; format: (n: number) => string }) => {
  const theme = useTheme();

  if (delta === 0) return <Box component="span" sx={{ color: 'text.disabled', ml: 0.5, fontSize: '0.68rem' }}>=</Box>;
  const good = lowerBetter ? delta < 0 : delta > 0;
  const color = good ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Box component="span" sx={{ color, ml: 0.5, fontSize: '0.68rem', fontFamily: MONO }}>
      {delta > 0 ? '+' : '−'}{format(Math.abs(delta))}
    </Box>
  );
};

const VerdictDot = ({ value }: { value: boolean | undefined }) => {
  const theme = useTheme();

  if (value === undefined) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  const color = value ? theme.palette.success.main : theme.palette.error.main;

  return value
    ? <CheckCircleRoundedIcon sx={{ fontSize: 15, color }} />
    : <CancelRoundedIcon sx={{ fontSize: 15, color }} />;
};

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
    const baseR = rolls[runIds[0]];
    const out: Record<string, Array<{ id: string; runName: string; value: number; delta: number | null }>> = {};

    SUMMARY_METRICS.forEach(m => {
      const baseRaw = baseR ? baseR[m.key] as number | null | undefined : null;
      const baseV = baseRaw !== null && baseRaw !== undefined ? baseRaw * m.scale : null;

      out[m.key] = runIds
        .map(id => {
          const raw = rolls[id]?.[m.key] as number | null | undefined;

          if (raw === null || raw === undefined) return null;
          const v = raw * m.scale;
          const delta = id !== runIds[0] && baseV !== null ? Number((v - baseV).toFixed(2)) : null;

          return { id, runName: runNameById[id] ?? id, value: Number(v.toFixed(2)), delta };
        })
        .filter((r): r is { id: string; runName: string; value: number; delta: number | null } => r !== null);
    });

    return out;
  }, [runIds, detailsByRun, runNameById]);

  if (runIds.length < 2) {
    return (
      
     
        <InfoMessage
          message="Select at least two workflows in the table to compare their agent trajectories."
          type="info"
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          fullHeight
        />
      
    );
  }

  if (!hasAny && anyLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 6, gap: 1.5 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">Fetching trajectories…</Typography>
      </Stack>
    );
  }

  if (!hasAny) {
    return (
      <Box sx={{ p: 2 }}>
        <InfoMessage message="No traces found for the selected workflows." type="info" icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />} fullHeight />
      </Box>
    );
  }

  const selectedQ = aligned.length ? aligned[Math.min(questionIdx, aligned.length - 1)] : undefined;
  const tasks = selectedQ ? alignTasks(selectedQ.byRun) : [];
  const judgeRows = selectedQ ? alignVerdicts(selectedQ.byRun, 'judges') : [];
  const checkRows = selectedQ ? alignVerdicts(selectedQ.byRun, 'checks') : [];

  const cellMs = (c: AlignedTaskCell | undefined) => (c ? c.durationMs : null);

  return (
    <Stack spacing={1.5} sx={{ p: 1.5 }}>
      {/* SUMMARY — bar charts per metric, layout follows Mosaic/Stacked. Hover syncs with the workflow table. */}
      {selectedExecutionsView === 'summary' && (
        <Grid container spacing={1.5}>
          {SUMMARY_METRICS.map(m => {
            const data = summaryDatasets[m.key] ?? [];
            const yMax = data.length ? Math.max(...data.map(d => d.value)) * 1.1 : 1;
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
                  scale: { paddingInner: 0.2, paddingOuter: 0.15 },
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
                  { field: 'delta', type: 'quantitative', title: 'Δ vs baseline', format: '+,.2f' },
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
                  <ResponsiveCardTable title={runNameById[id] ?? id} details={id === baseline ? 'baseline' : 'execution'}>
                    <Box sx={{ borderTop: `2px solid ${colorOf(id, i)}`, pt: 1 }}>
                      {trace
                        ? <ObservationWaterfall observations={trace.observations} />
                        : <EmptyNote>No trace for this question in this run.</EmptyNote>}
                    </Box>
                  </ResponsiveCardTable>
                </Grid>
              );
            })}
          </Grid>

          {/* Per-task delta table */}
          <ResponsiveCardTable title="Per-task delta" details="aligned by task name & occurrence">
            <Box sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <Th>Task</Th>
                    {runIds.map((id, i) => (
                      <Th key={id} align="right">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ minWidth: 0 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorOf(id, i), flexShrink: 0 }} />
                          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={runNameById[id] ?? id}>
                            {runNameById[id] ?? id}
                          </Box>
                        </Stack>
                      </Th>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map(task => {
                    const baseMs = cellMs(task.byRun[baseline]);

                    return (
                      <TableRow key={task.key} hover>
                        <Td>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colorForType(task.type), flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ fontFamily: MONO }}>{task.name}</Typography>
                          </Stack>
                        </Td>
                        {runIds.map(id => {
                          const c = task.byRun[id];

                          if (!c) return <Td key={id} align="right"><Box component="span" sx={{ color: 'text.disabled' }}>—</Box></Td>;

                          return (
                            <Td key={id} align="right">
                              <Box component="span" sx={{ fontFamily: MONO }}>{formatMs(c.durationMs)}</Box>
                              {id !== baseline && baseMs !== null && (
                                <DeltaText delta={c.durationMs - baseMs} lowerBetter format={formatMs} />
                              )}
                            </Td>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {tasks.length === 0 && (
                    <TableRow><Td>No tasks.</Td></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </ResponsiveCardTable>
        </>
      )}

      {selectedQ && selectedExecutionsView === 'verdicts' && (
        <>
          {/* Verdict diff — one aligned table, columns headed by workflow swatch+name */}
          {(judgeRows.length > 0 || checkRows.length > 0) && (
            <ResponsiveCardTable title="Verdict diff" details="regressions vs. baseline highlighted">
              <Box sx={{ overflow: 'auto' }}>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <Th>Verdict</Th>
                      {runIds.map((id, i) => (
                        <Th key={id} align="center">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ minWidth: 0 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorOf(id, i), flexShrink: 0 }} />
                            <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={runNameById[id] ?? id}>
                              {runNameById[id] ?? id}
                            </Box>
                          </Stack>
                        </Th>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[{ label: 'Judges', rows: judgeRows }, { label: 'Checks', rows: checkRows }].flatMap(group => {
                      if (group.rows.length === 0) return [];
                      const header = (
                        <TableRow key={`section-${group.label}`}>
                          <Td colSpan={runIds.length + 1}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.5px' }}>
                              {group.label}
                            </Typography>
                          </Td>
                        </TableRow>
                      );
                      const rows = group.rows.map(v => {
                        const baseVal = v.byRun[baseline];
                        const regression = baseVal === true && runIds.some(id => id !== baseline && v.byRun[id] === false);
                        const fix = baseVal === false && runIds.some(id => id !== baseline && v.byRun[id] === true);
                        const accent = regression ? theme.palette.error.main : fix ? theme.palette.info.main : 'transparent';

                        return (
                          <TableRow key={`${group.label}-${v.name}`}>
                            <Td>
                              <Box sx={{ borderLeft: `3px solid ${accent}`, pl: 1 }}>
                                <Typography variant="caption" sx={{ fontFamily: MONO }}>{v.name}</Typography>
                              </Box>
                            </Td>
                            {runIds.map(id => (
                              <Td key={id} align="center"><VerdictDot value={v.byRun[id]} /></Td>
                            ))}
                          </TableRow>
                        );
                      });

                      return [header, ...rows];
                    })}
                  </TableBody>
                </Table>
              </Box>
            </ResponsiveCardTable>
          )}
        </>
      )}
    </Stack>
  );
}
