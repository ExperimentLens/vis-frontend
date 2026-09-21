import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Chip, IconButton, Tooltip, Typography, alpha } from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { fetchAnnotations, selectAnnotations } from '../../../../../store/slices/observabilitySlice';
import { OBSERVABILITY_PROJECT_ID } from '../../../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import Loader from '../../../../../shared/components/loader';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { SCORE_SOURCE_COLOR, SCORE_SOURCE_LABEL, TONE_COLOR, TONE_LABEL, dimensionLabel, scoreSource, scoreTone } from '../../../../Tasks/Observability/score-dimensions';

// Scoped to the traces belonging to the runs currently selected in the
// comparison table above — the answer to "where do I see everything that's
// been annotated for what I'm looking at right now." The "Needs review"
// filter is what turns that from a log into a queue: skip everything that's
// fine, look only at what a reviewer flagged as bad (low score, "Missed
// escalation", etc).

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);

  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

interface AnnotationsBrowserProps {
  // traceId -> the name of the run/session it belongs to. Also doubles as
  // the scoping set: only traces present as a key are shown.
  traceSessionNames?: Record<string, string>;
  // traceId -> the trace's own name, shown in place of the raw id.
  traceNames?: Record<string, string>;
  // traceId -> id of the run/workflow it belongs to, used to open the trace.
  traceWorkflowIds?: Record<string, string>;
  experimentId?: string;
}

const AnnotationsBrowser = ({ traceSessionNames, traceNames, traceWorkflowIds, experimentId }: AnnotationsBrowserProps) => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(selectAnnotations);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchAnnotations({ projectId: OBSERVABILITY_PROJECT_ID }));
  }, [dispatch]);

  const scoped = useMemo(
    () => (traceSessionNames ? data.filter(s => s.traceId in traceSessionNames) : data),
    [data, traceSessionNames],
  );

  const sorted = useMemo(
    () => [...scoped].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [scoped],
  );

  const needsReviewCount = useMemo(
    () => sorted.filter(s => scoreTone(s) !== 'good').length,
    [sorted],
  );

  const visible = needsReviewOnly ? sorted.filter(s => scoreTone(s) !== 'good') : sorted;

  if (loading && data.length === 0) {
    return <Loader />;
  }

  if (error) {
    return (
      <InfoMessage
        message={error}
        type="error"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'error.main' }} />}
        fullHeight
      />
    );
  }

  if (scoped.length === 0) {
    return (
      <InfoMessage
        message={
          traceSessionNames && data.length > 0
            ? 'No annotations for the selected sessions.'
            : 'No annotations yet — annotate a step or trace from the Graph tab to see it here.'
        }
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  return (
    <ResponsiveCardTable
      title="Annotations"
      details={traceSessionNames ? `${scoped.length} across the selected sessions` : `${scoped.length} across this project`}
      headerActions={
        <Chip
          size="small"
          icon={<FlagRoundedIcon sx={{ fontSize: '14px !important' }} />}
          label={`Needs review only (${needsReviewCount})`}
          onClick={() => setNeedsReviewOnly(v => !v)}
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            bgcolor: needsReviewOnly ? '#dc2626' : 'transparent',
            color: needsReviewOnly ? '#ffffff' : '#dc2626',
            border: '1px solid #dc2626',
          }}
        />
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '150px 130px 60px 120px 100px 190px 1fr 1fr 170px 60px', gap: 0 }}>
          <Box sx={{ display: 'contents' }}>
            {['Session', 'Trace', 'Scope', 'Status', 'Source', 'Name', 'Value', 'Comment', 'When', ''].map((h, i) => (
              <Box key={i} sx={{ py: 0.75, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="statLabel" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6rem' }}>
                  {h}
                </Typography>
              </Box>
            ))}
          </Box>

          {visible.length === 0 && (
            <Box sx={{ gridColumn: '1 / -1', py: 3, textAlign: 'center' }}>
              <Typography variant="bodySm" color="text.secondary">Nothing needs review right now.</Typography>
            </Box>
          )}

          {visible.map(s => {
            const tone = scoreTone(s);
            const toneColor = TONE_COLOR[tone];
            const source = scoreSource(s.name);
            const sourceColor = SCORE_SOURCE_COLOR[source];

            return (
              <Box key={s.id} sx={{ display: 'contents' }}>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="bodySm" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={traceSessionNames?.[s.traceId]}>
                    {traceSessionNames?.[s.traceId] ?? '—'}
                  </Typography>
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="bodySm" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={s.traceId}>
                    {traceNames?.[s.traceId] ?? s.traceId}
                  </Typography>
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  {s.observationId ? (
                    <Chip size="small" label="step" sx={{ height: 16, fontSize: '0.58rem', bgcolor: alpha('#3766AF', 0.1), color: '#3766AF' }} />
                  ) : (
                    <Chip size="small" label="trace" sx={{ height: 16, fontSize: '0.58rem' }} />
                  )}
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Chip
                    size="small"
                    icon={tone === 'bad' ? <FlagRoundedIcon sx={{ fontSize: '12px !important' }} /> : undefined}
                    label={TONE_LABEL[tone]}
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(toneColor, 0.12), color: toneColor }}
                  />
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Chip
                    size="small"
                    label={SCORE_SOURCE_LABEL[source]}
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(sourceColor, 0.12), color: sourceColor }}
                  />
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="bodySm">{dimensionLabel(s.name)}</Typography>
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="bodySm" sx={{ fontWeight: 700 }}>{s.stringValue ?? s.value ?? '—'}</Typography>
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}`, minWidth: 0 }}>
                  <Typography variant="bodySm" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={s.comment}>
                    {s.comment || '—'}
                  </Typography>
                </Box>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="bodySm" sx={{ color: 'text.secondary' }}>{formatTimestamp(s.timestamp)}</Typography>
                </Box>
                <Box sx={{ py: 0.2, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {experimentId && traceWorkflowIds?.[s.traceId] && (
                    <Link to={`/${experimentId}/workflow?workflowId=${traceWorkflowIds[s.traceId]}&traceId=${s.traceId}`}>
                      <Tooltip title="Open trace">
                        <IconButton size="small" color="primary">
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Link>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </ResponsiveCardTable>
  );
};

export default AnnotationsBrowser;
