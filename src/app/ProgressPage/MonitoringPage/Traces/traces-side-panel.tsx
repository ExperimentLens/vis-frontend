import { useEffect, useMemo } from 'react';
import { Box, Button, Chip, CircularProgress, Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { PassFailChip } from '../../../Tasks/Observability/trace-ui';
import { formatMs, isErrorLevel, MONO } from '../../../../shared/models/observability/agentic-conventions';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import { EMPTY_FILTERS, filterTraceRows, toTraceRows } from '../../../../shared/utils/trace-explorer';
import type { TraceFilters, TraceRow } from '../../../../shared/utils/trace-explorer';
import { useLlmSessionTraces } from '../LLMOverview/use-llm-session-traces';

interface Props {
  title: string;
  detail?: string;
  /** Which traces to show, as Traces-tab filters. */
  filters: Partial<TraceFilters>;
  onClose: () => void;
  /** Opens the Traces tab with the same filters applied. */
  onOpenTraces: (filters: Partial<TraceFilters>) => void;
}

const MAX_TRACES = 50;

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="captionLabel" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</Typography>
);

const clamp = (lines: number) => ({ display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }) as const;

/** One trace at a glance: what was asked, what came back and which checks it failed. */
function TraceSummary({ row, href }: { row: TraceRow; href: string }) {
  const failed = row.judges.filter(j => !j.passed);
  const errors = row.trace.observations.filter(isErrorLevel);

  // flexShrink 0: in the scrolling column the cards would otherwise be squeezed and clipped.
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.25, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontFamily: MONO, fontWeight: 700, minWidth: 0 }} noWrap title={row.runName}>{row.variant}</Typography>
        {row.caseId !== '—' && <Chip size="small" variant="outlined" label={`case ${row.caseId}`} sx={{ height: 20 }} />}
        {row.status === 'error' && <Chip size="small" color="error" label="ERROR" sx={{ height: 20, fontWeight: 700 }} />}
        {row.judges.length > 0 && (
          <PassFailChip
            passed={row.failedChecks.length === 0}
            label={`${row.failedChecks.length ? 'FAIL' : 'PASS'} ${row.judges.length - row.failedChecks.length}/${row.judges.length}`}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontFamily: MONO }}>
          {formatMs(row.latencyMs)}{row.tokens ? ` · ${row.tokens.toLocaleString()} tok` : ''}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={{ p: 1.25 }}>
        <Stack spacing={0.25}>
          <Label>Question</Label>
          <Typography variant="body2" sx={clamp(2)} title={row.question}>{row.question}</Typography>
        </Stack>
        <Stack spacing={0.25}>
          <Label>Answer</Label>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="body2" sx={clamp(3)} title={row.answer}>{row.answer}</Typography>
          </Box>
        </Stack>
        {errors.length > 0 && (
          <Stack spacing={0.5}>
            <Label>Errors</Label>
            {errors.map(o => (
              <Box key={o.id} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', fontFamily: MONO }}>{o.name}</Typography>
                {o.statusMessage && <Typography variant="caption" color="text.secondary" sx={clamp(3)} title={o.statusMessage}>{o.statusMessage}</Typography>}
              </Box>
            ))}
          </Stack>
        )}
        {failed.length > 0 && (
          <Stack spacing={0.5}>
            <Label>Failed checks</Label>
            {failed.map(j => (
              <Box key={j.name} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>{j.name}</Typography>
                {j.rationale && <Typography variant="caption" color="text.secondary" sx={clamp(2)}>{j.rationale}</Typography>}
              </Box>
            ))}
          </Stack>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" startIcon={<LaunchRoundedIcon />} component={RouterLink} to={href}>Open trace</Button>
        </Box>
      </Stack>
    </Paper>
  );
}

/**
 * A filtered set of traces, read beside another view like the Traces tab's panel
 * (an attention item on the Overview, a heatmap cell on Quality); the tab is one click away.
 */
export default function TracesSidePanel({ title, detail, filters, onClose, onOpenTraces }: Props) {
  const { experimentId } = useParams();
  const { allDetails, anyLoading, hasData } = useLlmSessionTraces();
  const runs = useAppSelector((s: RootState) => s.progressPage.workflows.data);

  const rows = useMemo(
    () => filterTraceRows(toTraceRows(allDetails, runs), { ...EMPTY_FILTERS, ...filters }),
    [allDetails, runs, filters],
  );

  // Esc closes the panel, unless typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{title}</Typography>
          {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
        </Box>
        {anyLoading && <CircularProgress size={14} sx={{ mt: 0.5 }} />}
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', mt: 0.25 }}>
          {rows.length} {rows.length === 1 ? 'trace' : 'traces'}
        </Typography>
        <Tooltip title="Close (Esc)"><IconButton size="small" onClick={onClose}><CloseRoundedIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>

      <Stack spacing={1.25} sx={{ p: 1.5, overflow: 'auto', flex: 1 }}>
        {!hasData && anyLoading && (
          <Stack alignItems="center" sx={{ py: 4, gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">Fetching traces…</Typography>
          </Stack>
        )}
        {(hasData || !anyLoading) && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No traces match.</Typography>
        )}
        {rows.slice(0, MAX_TRACES).map(row => (
          <TraceSummary
            key={row.id}
            row={row}
            href={`/${experimentId}/workflow?workflowId=${row.sessionId}&traceId=${row.id}`}
          />
        ))}
        {rows.length > MAX_TRACES && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            and {rows.length - MAX_TRACES} more — open them in the Traces tab
          </Typography>
        )}
      </Stack>

      <Divider />
      <Stack direction="row" sx={{ p: 1, justifyContent: 'flex-end' }}>
        <Button size="small" variant="outlined" startIcon={<FilterListRoundedIcon />} onClick={() => onOpenTraces(filters)}>
          Open in Traces tab
        </Button>
      </Stack>
    </Paper>
  );
}
