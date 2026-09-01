import { useEffect, useMemo } from 'react';
import { Box, Chip, CircularProgress, Typography, useTheme } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { RootState } from '../../../../store/store';
import { setSelectedId, setSelectedItem } from '../../../../store/slices/workflowPageSlice';
import { fetchAnnotations, getTrace, getTraces, selectAnnotations } from '../../../../store/slices/observabilitySlice';
import { MONO, OBSERVABILITY_PROJECT_ID } from '../../../../shared/models/observability/agentic-conventions';
import type { ReviewTone } from '../../../Tasks/Observability/score-dimensions';
import { TONE_COLOR, TONE_LABEL, isHumanScoreName, scoreTone, worstTone } from '../../../Tasks/Observability/score-dimensions';

// The trace LIST endpoint's `scores` field only carries score ids, not full
// objects (unlike a single trace's own detail fetch), so it can't tell us
// which traces have human annotations. Instead this reuses the same
// `/api/observability/scores` listing that powers the Annotations browse tab,
// and groups it by traceId locally.

const AnnotationBadge = ({ count, tone, title }: { count: number; tone: ReviewTone; title: string }) => {
  const color = TONE_COLOR[tone];

  return (
    <Box
      title={title}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.5,
        py: 0.1,
        borderRadius: 999,
        bgcolor: `${color}1a`,
        color,
        flexShrink: 0,
      }}
    >
      {tone === 'bad'
        ? <FlagRoundedIcon sx={{ fontSize: 12 }} />
        : <RateReviewRoundedIcon sx={{ fontSize: 12 }} />}
      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700 }}>{count}</Typography>
    </Box>
  );
};

export default function TracesAccordion() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { experimentId: experimentIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const traceIdParam = searchParams.get('traceId');

  const { tab } = useAppSelector((s: RootState) => s.workflowPage);
  const workflowId = tab?.workflowId;
  const run = useAppSelector((s: RootState) =>
    s.progressPage.workflows.data.find(w => w.id === workflowId),
  );
  const experimentId = run?.experimentId ?? experimentIdParam;

  const { data, loading, error } = useAppSelector((s: RootState) => s.observability.traces);
  const { data: annotations } = useAppSelector(selectAnnotations);
  const selectedId = tab?.dataTaskTable?.selectedId ?? null;

  useEffect(() => {
    if (!experimentId || !workflowId || workflowId === 'none') return;
    dispatch(
      getTraces({ projectId: OBSERVABILITY_PROJECT_ID, userId: experimentId, sessionId: workflowId }),
    );
  }, [dispatch, experimentId, workflowId]);

  useEffect(() => {
    dispatch(fetchAnnotations({ projectId: OBSERVABILITY_PROJECT_ID }));
  }, [dispatch]);

  // Deep link from the "All traces" table: land directly on the selected trace
  // instead of requiring an extra click in this tree once it loads.
  useEffect(() => {
    if (!traceIdParam) return;
    dispatch(setSelectedId(traceIdParam));
    dispatch(setSelectedItem({ type: 'trace', data: { traceId: traceIdParam } }));
    dispatch(getTrace(traceIdParam));
  }, [dispatch, traceIdParam]);

  const traces = data?.data ?? [];

  // Grouped by trace, not just counted — a badge needs to know the WORST
  // tone among a trace's annotations (a "Missed escalation" should read
  // very differently from a "Correctly escalated"), not just how many there are.
  const humanScoresByTraceId = useMemo(() => {
    const map: Record<string, typeof annotations> = {};

    annotations.forEach(s => {
      if (isHumanScoreName(s.name)) {
        (map[s.traceId] ??= []).push(s);
      }
    });

    return map;
  }, [annotations]);

  const allHumanScores = useMemo(
    () => traces.flatMap(t => humanScoresByTraceId[t.id] ?? []),
    [traces, humanScoresByTraceId],
  );
  const totalAnnotated = allHumanScores.length;
  const sessionTone = worstTone(allHumanScores.map(scoreTone));

  const handleSelect = (traceId: string) => {
    dispatch(setSelectedId(traceId));
    dispatch(setSelectedItem({ type: 'trace', data: { traceId } }));
    dispatch(getTrace(traceId));
  };

  return (
    <SimpleTreeView defaultExpandedItems={['traces-root']} selectedItems={selectedId}>
      <TreeItem
        itemId="traces-root"
        slotProps={{ content: { style: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 } } }}
        label={
          <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HubRoundedIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
            <Typography sx={{ mr: 1 }}>Session Traces</Typography>
            <Chip size="small" label={loading ? '…' : traces.length} sx={{ height: 18, fontSize: '0.65rem' }} />
            {!loading && totalAnnotated > 0 && (
              <AnnotationBadge
                count={totalAnnotated}
                tone={sessionTone}
                title={`${totalAnnotated} human annotation${totalAnnotated === 1 ? '' : 's'} in this session — ${TONE_LABEL[sessionTone]}`}
              />
            )}
          </Box>
        }
      >
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">Loading traces…</Typography>
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
            <ErrorOutlineRoundedIcon fontSize="small" color="error" />
            <Typography variant="caption" color="error">Failed to load traces.</Typography>
          </Box>
        )}

        {!loading && !error && traces.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
            No traces for this workflow.
          </Typography>
        )}

        {traces.map(t => {
          const traceScores = humanScoresByTraceId[t.id] ?? [];
          const annotated = traceScores.length;
          const tone = worstTone(traceScores.map(scoreTone));
          const borderColor = annotated ? TONE_COLOR[tone] : 'transparent';

          return (
            <TreeItem
              key={t.id}
              itemId={t.id}
              label={
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    borderLeft: `2px solid ${borderColor}`,
                  }}
                  onClick={(e) => { e.stopPropagation(); handleSelect(t.id); }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <AccountTreeRoundedIcon fontSize="small" sx={{ color: theme.palette.secondary.main, flexShrink: 0 }} />
                    <Typography
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1, minWidth: 0 }}
                      title={t.name || t.id}
                    >
                      {t.name || t.id}
                    </Typography>
                    {annotated > 0 && (
                      <AnnotationBadge
                        count={annotated}
                        tone={tone}
                        title={`${annotated} human annotation${annotated === 1 ? '' : 's'} — ${TONE_LABEL[tone]}`}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', pl: 3, fontFamily: MONO, fontSize: '0.62rem' }}
                  >
                    {new Date(t.timestamp).toLocaleTimeString()} · {t.observations?.length ?? 0} obs
                  </Typography>
                </Box>
              }
            />
          );
        })}
      </TreeItem>
    </SimpleTreeView>
  );
}
