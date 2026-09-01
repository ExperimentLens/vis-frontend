import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Typography, alpha } from '@mui/material';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { fetchAnnotations, selectAnnotations } from '../../../../../store/slices/observabilitySlice';
import { OBSERVABILITY_PROJECT_ID } from '../../../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import Loader from '../../../../../shared/components/loader';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { TONE_COLOR, TONE_LABEL, dimensionLabel, scoreTone } from '../../../../Tasks/Observability/score-dimensions';

// Project-wide, deliberately not scoped to the runs currently selected in the
// comparison table above — this is "every annotation anyone has left on any
// trace in this Langfuse project," the answer to "where do I see everything
// that's been annotated." The "Needs review" filter is what turns that from
// a log into a queue: skip everything that's fine, look only at what a
// reviewer flagged as bad (low score, "Missed escalation", etc).

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);

  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const AnnotationsBrowser = () => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(selectAnnotations);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchAnnotations({ projectId: OBSERVABILITY_PROJECT_ID }));
  }, [dispatch]);

  const sorted = useMemo(
    () => [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [data],
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

  if (data.length === 0) {
    return (
      <InfoMessage
        message="No annotations yet — annotate a step or trace from the Graph tab to see it here."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  return (
    <ResponsiveCardTable
      title="Annotations"
      details={`${data.length} across this project`}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: '160px 90px 120px 190px 1fr 1fr 170px', gap: 0 }}>
          <Box sx={{ display: 'contents' }}>
            {['Trace', 'Scope', 'Status', 'Name', 'Value', 'Comment', 'When'].map(h => (
              <Box key={h} sx={{ py: 0.75, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
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

            return (
              <Box key={s.id} sx={{ display: 'contents' }}>
                <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="mono" sx={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={s.traceId}>
                    {s.traceId}
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
              </Box>
            );
          })}
        </Box>
      </Box>
    </ResponsiveCardTable>
  );
};

export default AnnotationsBrowser;
