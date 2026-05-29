import { useEffect } from 'react';
import { Box, Chip, CircularProgress, Typography, useTheme } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { RootState } from '../../../../store/store';
import { setSelectedId, setSelectedItem } from '../../../../store/slices/workflowPageSlice';
import { getTrace, getTraces } from '../../../../store/slices/observabilitySlice';

const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// Hardcoded until the backend exposes a project mapping per experiment.
const OBSERVABILITY_PROJECT_ID = 'cmp72x36n0006n207vrcgltju';

export default function TracesAccordion() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { experimentId: experimentIdParam } = useParams();

  const { tab } = useAppSelector((s: RootState) => s.workflowPage);
  const workflowId = tab?.workflowId;
  const run = useAppSelector((s: RootState) =>
    s.progressPage.workflows.data.find(w => w.id === workflowId),
  );
  const experimentId = run?.experimentId ?? experimentIdParam;

  const { data, loading, error } = useAppSelector((s: RootState) => s.observability.traces);
  const selectedId = tab?.dataTaskTable?.selectedId ?? null;

  useEffect(() => {
    if (!experimentId || !workflowId || workflowId === 'none') return;
    dispatch(
      getTraces({ projectId: OBSERVABILITY_PROJECT_ID, userId: experimentId, sessionId: workflowId }),
    );
  }, [dispatch, experimentId, workflowId]);

  const traces = data?.data ?? [];

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

        {traces.map(t => (
          <TreeItem
            key={t.id}
            itemId={t.id}
            label={
              <Box
                sx={{ px: 1, py: 0.5, borderRadius: 1, cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); handleSelect(t.id); }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  <AccountTreeRoundedIcon fontSize="small" sx={{ color: theme.palette.secondary.main, flexShrink: 0 }} />
                  <Typography
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={t.name || t.id}
                  >
                    {t.name || t.id}
                  </Typography>
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
        ))}
      </TreeItem>
    </SimpleTreeView>
  );
}
