import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
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
  const theme = useTheme();
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
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar - 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 44,
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle2" fontWeight={800}>
          Traces
        </Typography>

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

      {hasData && (
        <AllTracesTable
          details={allDetails}
          experimentId={experimentId}
          runNameById={runNameById}
          selectedTraceIds={selectedTraceIds}
          onClearSelection={clearSelection}
        />
      )}
    </Stack>
  );
}
