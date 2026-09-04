import { useEffect, useMemo } from 'react';
import { Box, Chip, CircularProgress, Paper, Stack, Typography, useTheme } from '@mui/material';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import IconButton from '@mui/material/IconButton';
import { useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { RootState } from '../../../../store/store';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { fetchSessionTraceDetails, getTrace, selectSessionsMap } from '../../../../store/slices/observabilitySlice';
import { setSelectedId, setSelectedItem } from '../../../../store/slices/workflowPageSlice';
import {
  MONO,
  OBSERVABILITY_PROJECT_ID,
  asText,
  formatMs,
  isJudge,
  modelOf,
} from '../../../../shared/models/observability/agentic-conventions';
import type { GenOutput, TraceInput, TraceOutput } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { AnnotationBadge } from '../../MonitoringPage/LLMOverview/llm-monitoring-shared';
import { isHumanScoreName, scoreTone, worstTone } from '../../../Tasks/Observability/score-dimensions';

const traceLatencyMs = (t: TraceDetail): number => {
  const times = t.observations
    .flatMap(o => [Date.parse(o.startTime), Date.parse(o.endTime)])
    .filter(n => !Number.isNaN(n));

  if (times.length) return Math.max(...times) - Math.min(...times);

  return (t.latency ?? 0) * 1000;
};

const traceModel = (t: TraceDetail): string | undefined => {
  const gen = t.observations.find(o => (o.type ?? '').toUpperCase() === 'GENERATION');

  return gen ? modelOf(gen) : undefined;
};

const TracePreviewCard = ({ trace, onOpen }: { trace: TraceDetail; onOpen: () => void }) => {
  const theme = useTheme();

  const input = trace.input as TraceInput;
  const output = trace.output as TraceOutput;

  const question = typeof input?.question === 'string' ? input.question : asText(trace.input);
  const answer = typeof output?.answer === 'string' ? output.answer : asText(trace.output);

  const model = traceModel(trace);
  const judges = trace.observations.filter(isJudge);
  const judgesPassed = judges.filter(o => (o.output as GenOutput)?.passed === true).length;

  const humanScores = (trace.scores ?? []).filter(s => isHumanScoreName(s.name));
  const tone = worstTone(humanScores.map(scoreTone));

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        cursor: 'pointer',
        '&:hover': { borderColor: theme.palette.primary.main, bgcolor: 'action.hover' },
      }}
      onClick={onOpen}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccountTreeRoundedIcon fontSize="small" sx={{ color: theme.palette.secondary.main, flexShrink: 0 }} />
        <Typography
          sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1, minWidth: 0 }}
          title={trace.name || trace.id}
        >
          {trace.name || trace.id}
        </Typography>

        {humanScores.length > 0 && <AnnotationBadge count={humanScores.length} tone={tone} />}

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {model && <Chip size="small" label={model} sx={{ height: 20, fontSize: '0.65rem' }} />}
          {judges.length > 0 && (
            <Chip
              size="small"
              label={`${judgesPassed}/${judges.length} judges`}
              color={judgesPassed === judges.length ? 'success' : 'warning'}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
          <Chip size="small" label={formatMs(traceLatencyMs(trace))} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        </Stack>

        <IconButton size="small" onClick={e => { e.stopPropagation(); onOpen(); }} title="Open full trace">
          <LaunchRoundedIcon fontSize="inherit" />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO, fontSize: '0.62rem', display: 'block', mb: 1 }}>
        {new Date(trace.timestamp).toLocaleString()}
      </Typography>

      <Stack spacing={1}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Input</Typography>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {question}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Output</Typography>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {answer}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default function WorkflowTracesOverview() {
  const dispatch = useAppDispatch();
  const { experimentId: experimentIdParam } = useParams();

  const { tab } = useAppSelector((s: RootState) => s.workflowPage);
  const workflowId = tab?.workflowId;
  const run = useAppSelector((s: RootState) =>
    s.progressPage.workflows.data.find(w => w.id === workflowId),
  );
  const experimentId = run?.experimentId ?? experimentIdParam;

  const sessionsMap = useAppSelector(selectSessionsMap);
  const session = workflowId ? sessionsMap[workflowId] : undefined;

  useEffect(() => {
    if (!experimentId || !workflowId || workflowId === 'none') return;
    dispatch(fetchSessionTraceDetails({ projectId: OBSERVABILITY_PROJECT_ID, experimentId, workflowId }));
  }, [dispatch, experimentId, workflowId]);

  const traces = useMemo(
    () => [...(session?.details ?? [])].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
    [session?.details],
  );

  const handleOpen = (traceId: string) => {
    dispatch(setSelectedId(traceId));
    dispatch(setSelectedItem({ type: 'trace', data: { traceId } }));
    dispatch(getTrace(traceId));
  };

  if (session?.loading && traces.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading traces…</Typography>
      </Box>
    );
  }

  if (session?.error) {
    return <InfoMessage message="Failed to load traces for this session." type="error" fullHeight />;
  }

  if (traces.length === 0) {
    return <InfoMessage message="No traces for this workflow." type="info" fullHeight />;
  }

  return (
    <Stack spacing={1.25}>
      {traces.map(t => (
        <TracePreviewCard key={t.id} trace={t} onOpen={() => handleOpen(t.id)} />
      ))}
    </Stack>
  );
}
