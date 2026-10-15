import { useMemo } from 'react';
import { Box, Chip, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { StyledDataGrid } from '../LLMOverview/llm-monitoring-shared';
import { formatMs, MONO } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceRow, TraceStatus } from '../../../../shared/utils/trace-explorer';

interface Props {
  rows: TraceRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Hide the wide text columns' neighbours when the side panel takes half the width. */
  compact: boolean;
}

const STATUS_LABEL: Record<TraceStatus, string> = { error: 'Error', fail: 'Failed a check', pass: 'Passed every check', unjudged: 'No checks' };

const clip = (text: string) => <Typography variant="body2" noWrap title={text} sx={{ minWidth: 0 }}>{text}</Typography>;

/** One row per trace: what was asked, what came back, and how it was judged. */
export default function TraceList({ rows, selectedId, onSelect, compact }: Props) {
  const theme = useTheme();

  const columns = useMemo<GridColDef[]>(() => {
    const statusColor: Record<TraceStatus, string> = {
      error: theme.palette.error.main,
      fail: theme.palette.error.main,
      pass: theme.palette.success.main,
      unjudged: theme.palette.text.disabled,
    };

    const all: Array<GridColDef & { wide?: boolean }> = [
      {
        field: 'status',
        headerName: '',
        width: 36,
        sortable: true,
        renderCell: p => (
          <Tooltip title={STATUS_LABEL[p.value as TraceStatus]}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ width: 9, height: 9, borderRadius: p.value === 'error' ? 0.5 : '50%', bgcolor: statusColor[p.value as TraceStatus] }} />
            </Box>
          </Tooltip>
        ),
      },
      { field: 'question', headerName: 'Question', flex: 1.2, minWidth: 200, renderCell: p => clip(String(p.value)) },
      { field: 'answer', headerName: 'Answer', flex: 1.2, minWidth: 200, wide: true, renderCell: p => clip(String(p.value)) },
      {
        field: 'variant',
        headerName: 'Variant',
        width: 150,
        renderCell: p => <Typography variant="body2" noWrap sx={{ fontFamily: MONO, fontSize: '0.78rem' }} title={String(p.value)}>{String(p.value)}</Typography>,
      },
      { field: 'caseId', headerName: 'Case', width: 90, wide: true },
      {
        field: 'checks',
        headerName: 'Checks',
        width: 220,
        sortable: true,
        valueGetter: (_v, row) => (row as TraceRow).failedChecks.length,
        renderCell: p => {
          const row = p.row as TraceRow;

          if (!row.judges.length) return <Typography variant="caption" color="text.secondary">—</Typography>;
          const passed = row.judges.length - row.failedChecks.length;

          return (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%', overflow: 'hidden' }}>
              <Typography variant="caption" sx={{ fontFamily: MONO, fontWeight: 700, color: row.failedChecks.length ? 'error.main' : 'success.main', flexShrink: 0 }}>
                {passed}/{row.judges.length}
              </Typography>
              {row.failedChecks.slice(0, 2).map(name => (
                <Chip key={name} size="small" label={name} color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              ))}
              {row.failedChecks.length > 2 && (
                <Typography variant="caption" color="error.main">+{row.failedChecks.length - 2}</Typography>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'latencyMs',
        headerName: 'Latency',
        width: 90,
        type: 'number',
        headerAlign: 'right',
        align: 'right',
        renderCell: p => <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.78rem' }}>{formatMs(Number(p.value))}</Box>,
      },
      { field: 'tokens', headerName: 'Tokens', width: 80, type: 'number', headerAlign: 'right', align: 'right', wide: true },
      {
        field: 'timestamp',
        headerName: 'Started',
        width: 140,
        wide: true,
        valueFormatter: (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ];

    return all.filter(c => !(compact && c.wide));
  }, [compact, theme]);

  return (
    <StyledDataGrid
      rows={rows}
      columns={columns}
      density="compact"
      rowHeight={44}
      columnHeaderHeight={40}
      disableColumnMenu
      onRowClick={p => onSelect(String(p.id))}
      rowSelectionModel={{ type: 'include', ids: new Set(selectedId ? [selectedId] : []) }}
      initialState={{ pagination: { paginationModel: { pageSize: 50, page: 0 } } }}
      pageSizeOptions={[25, 50, 100]}
      sx={{ width: '100%', height: '100%', border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }}
    />
  );
}
