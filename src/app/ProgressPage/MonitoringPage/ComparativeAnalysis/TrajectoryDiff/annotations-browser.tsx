import { useEffect } from 'react';
import { Box, Chip, Typography, alpha } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import { fetchAnnotations, selectAnnotations } from '../../../../../store/slices/observabilitySlice';
import { OBSERVABILITY_PROJECT_ID } from '../../../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import Loader from '../../../../../shared/components/loader';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Project-wide, deliberately not scoped to the runs currently selected in the
// comparison table above — this is "every annotation anyone has left on any
// trace in this Langfuse project," the answer to "where do I see everything
// that's been annotated."

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);

  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const AnnotationsBrowser = () => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(selectAnnotations);

  useEffect(() => {
    dispatch(fetchAnnotations({ projectId: OBSERVABILITY_PROJECT_ID }));
  }, [dispatch]);

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

  const sorted = [...data].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ResponsiveCardTable title="Annotations" details={`${data.length} across this project`}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '160px 100px 140px 60px 1fr 170px', gap: 0 }}>
          <Box sx={{ display: 'contents' }}>
            {['Trace', 'Scope', 'Name', 'Value', 'Comment', 'When'].map(h => (
              <Box key={h} sx={{ py: 0.75, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="statLabel" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6rem' }}>
                  {h}
                </Typography>
              </Box>
            ))}
          </Box>

          {sorted.map(s => (
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
                <Typography variant="bodySm">{s.name}</Typography>
              </Box>
              <Box sx={{ py: 0.6, px: 1, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="bodySm" sx={{ fontWeight: 700 }}>{s.value}</Typography>
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
          ))}
        </Box>
      </Box>
    </ResponsiveCardTable>
  );
};

export default AnnotationsBrowser;
