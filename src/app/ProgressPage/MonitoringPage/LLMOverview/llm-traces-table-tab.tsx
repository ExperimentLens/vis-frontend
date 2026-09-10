import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate, useLocation } from 'react-router-dom';

import InfoMessage from '../../../../shared/components/InfoMessage';
import { getCache, removeCache } from '../../../../shared/utils/localStorageCache';
import AllTracesTable from './all-traces-table';
import { useLlmSessionTraces } from './use-llm-session-traces';
import { useParams } from 'react-router';

export default function LlmTracesTableTab() {
  const { experimentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const traceSelectionId = new URLSearchParams(location.search).get('traceSelectionId');

  const [selectedTraceIds, setSelectedTraceIds] = useState<string[] | null>(null);

  const {
    workflowIds,
    runNameById,
    allDetails,
    anyLoading,
    hasData,
    refresh,
  } = useLlmSessionTraces();

  const selectedCount = useMemo(() => {
    if (!selectedTraceIds) return 0;

    const idSet = new Set(selectedTraceIds);

    return allDetails.filter(d => idSet.has(d.id)).length;
  }, [allDetails, selectedTraceIds]);

  useEffect(() => {
    if (!traceSelectionId) return;

    const cached = getCache<{ traceIds: string[] }>(traceSelectionId);

    if (cached?.traceIds) {
      setSelectedTraceIds(cached.traceIds);
    }
  }, [traceSelectionId]);

  const clearSelection = () => {
    setSelectedTraceIds(null);

    if (!traceSelectionId) return;

    removeCache(traceSelectionId);

    const searchParams = new URLSearchParams(location.search);

    searchParams.delete('traceSelectionId');
    navigate({
      pathname: location.pathname,
      search: searchParams.toString(),
    }, { replace: true });
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
    <Paper 
      elevation={0}
      variant="outlined"
      sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}
    >
      <Toolbar
        variant="dense"
        sx={{
          minHeight: 44,
          height: 44,
          '@media (min-width:600px)': {
            minHeight: 44,
            height: 44,
          },
          flex: '0 0 auto',
          gap: 1,
          px: 1.5,
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ flexGrow: 1 }} />

        {selectedTraceIds && (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`${selectedCount} of ${allDetails.length} traces (from chart)`}
            onDelete={clearSelection}
          />
        )}

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
      </Toolbar>

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

      {hasData && (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <AllTracesTable
            details={allDetails}
            experimentId={experimentId}
            runNameById={runNameById}
            selectedTraceIds={selectedTraceIds}
          />
        </Box>
      )}
    </Paper>
  );
}
