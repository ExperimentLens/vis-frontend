import { useMemo, useState } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useNavigate } from 'react-router-dom';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import { EmptyNote } from './chart-kit';
import { StyledDataGrid, TruncMono } from './llm-monitoring-shared';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import type { GenOutput } from '../../../../shared/models/observability/agentic-conventions';
import { formatMs, isJudge, modelOf, prettyName } from '../../../../shared/models/observability/agentic-conventions';
import type { ReviewTone } from '../../../Tasks/Observability/score-dimensions';
import { TONE_COLOR, TONE_LABEL, isHumanScoreName, scoreTone, worstTone } from '../../../Tasks/Observability/score-dimensions';

type JudgeVerdict = 'pass' | 'fail' | null;

type Row = {
  id: string;
  isGroupHeader?: boolean;
  name?: string;
  sessionId: string;
  model?: string;
  latencyMs?: number;
  tokens?: number;
  cost?: number;
  timestamp?: string;
  count?: number;
  annotatedCount?: number;
  annotationTone?: ReviewTone;
  [judgeField: string]: unknown;
};

const humanScoresOf = (t: TraceDetail) => (t.scores ?? []).filter(s => isHumanScoreName(s.name));

const traceLatencyMs = (t: TraceDetail): number => {
  const times = t.observations
    .flatMap(o => [Date.parse(o.startTime), Date.parse(o.endTime)])
    .filter(n => !Number.isNaN(n));

  if (times.length) return Math.max(...times) - Math.min(...times);

  return (t.latency ?? 0) * 1000;
};

const traceTokens = (t: TraceDetail): number =>
  t.observations.reduce((s, o) => s + ((o.output as GenOutput)?.tokens?.total_tokens ?? 0), 0);

const traceModel = (t: TraceDetail): string => {
  const gen = t.observations.find(o => (o.type ?? '').toUpperCase() === 'GENERATION');

  return (gen && modelOf(gen)) || '—';
};

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

export default function AllTracesTable({
  details,
  experimentId,
  selectedTraceIds,
  onClearSelection,
  runNameById,
}: {
  details: TraceDetail[];
  experimentId: string | undefined;
  /** When set, only these trace ids are shown — e.g. traces from a bucket clicked in the time chart. */
  selectedTraceIds?: string[] | null;
  onClearSelection?: () => void;
  runNameById?: Record<string, string>;
}) {
  const navigate = useNavigate();
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());

  const goToTrace = (row: Row) => {
    if (!experimentId || !row.sessionId) return;
    navigate(`/${experimentId}/workflow?workflowId=${row.sessionId}&traceId=${row.id}`);
  };

  const goToWorkflow = (sessionId: string) => {
    if (!experimentId || !sessionId) return;
    navigate(`/${experimentId}/workflow?workflowId=${sessionId}`);
  };

  const toggleSession = (sessionId: string) => {
    setCollapsedSessions(prev => {
      const next = new Set(prev);

      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }

      return next;
    });
  };

  // One column per distinct judge (raw observation name), keyed by index so
  // field names stay valid regardless of what the judge is called.
  const judgeMeta = useMemo(() => {
    const names: string[] = [];
    const seen = new Set<string>();

    details.forEach(t =>
      t.observations.filter(isJudge).forEach(o => {
        if (!seen.has(o.name)) {
          seen.add(o.name);
          names.push(o.name);
        }
      }),
    );

    return names.map(rawName => {
      let pass = 0;
      let total = 0;

      details.forEach(t =>
        t.observations
          .filter(o => o.name === rawName && isJudge(o))
          .forEach(o => {
            const passed = (o.output as GenOutput)?.passed;

            if (typeof passed === 'boolean') {
              total++;
              if (passed) pass++;
            }
          }),
      );

      return {
        rawName,
        label: prettyName(rawName),
        passRate: total ? pass / total : null,
      };
    });
  }, [details]);

  const traceRows: Row[] = useMemo(
    () =>
      details
        .map(t => {
          const humanScores = humanScoresOf(t);
          const row: Row = {
            id: t.id,
            name: t.name || t.id,
            sessionId: t.sessionId,
            model: traceModel(t),
            latencyMs: traceLatencyMs(t),
            tokens: traceTokens(t),
            cost: t.totalCost ?? 0,
            timestamp: t.timestamp,
            annotatedCount: humanScores.length,
            annotationTone: worstTone(humanScores.map(scoreTone)),
          };

          judgeMeta.forEach((j, i) => {
            const obs = t.observations.find(o => o.name === j.rawName && isJudge(o));
            const passed = obs ? (obs.output as GenOutput)?.passed : undefined;

            row[`judge__${i}`] = (typeof passed === 'boolean' ? (passed ? 'pass' : 'fail') : null) as JudgeVerdict;
          });

          return row;
        })
        .sort((a, b) => Date.parse(b.timestamp ?? '') - Date.parse(a.timestamp ?? '')),
    [details, judgeMeta],
  );

  const filteredRows = useMemo(() => {
    if (!selectedTraceIds) return traceRows;

    const idSet = new Set(selectedTraceIds);

    return traceRows.filter(r => idSet.has(r.id));
  }, [traceRows, selectedTraceIds]);

  const sessionGroups = useMemo(() => {
    const map = new Map<string, Row[]>();

    filteredRows.forEach(r => {
      const arr = map.get(r.sessionId) ?? [];

      arr.push(r);
      map.set(r.sessionId, arr);
    });

    return Array.from(map.entries()).sort(
      (a, b) => Date.parse(b[1][0]?.timestamp ?? '') - Date.parse(a[1][0]?.timestamp ?? ''),
    );
  }, [filteredRows]);

  // Group summary row: real per-column aggregates (not a single spanning
  // banner) so it reads the same way the Overview table's "N workflows" rows
  // do — model shown if uniform across the group, judge columns show the
  // group's pass rate, latency/tokens/cost show averages/totals.
  const buildGroupRow = (sessionId: string, rows: Row[]): Row => {
    const models = new Set(rows.map(r => r.model));
    const timestamps = rows.map(r => Date.parse(r.timestamp ?? '')).filter(n => !Number.isNaN(n));

    const row: Row = {
      id: `group-${sessionId}`,
      isGroupHeader: true,
      sessionId,
      count: rows.length,
      model: models.size === 1 ? rows[0].model : 'n/a',
      latencyMs: avg(rows.map(r => r.latencyMs ?? 0)),
      tokens: rows.reduce((s, r) => s + (r.tokens ?? 0), 0),
      cost: rows.reduce((s, r) => s + (r.cost ?? 0), 0),
      timestamp: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined,
      annotatedCount: rows.reduce((s, r) => s + (r.annotatedCount ?? 0), 0),
      annotationTone: worstTone(rows.map(r => r.annotationTone ?? 'good')),
    };

    judgeMeta.forEach((_, i) => {
      const field = `judge__${i}`;
      const verdicts = rows.map(r => r[field]).filter((v): v is 'pass' | 'fail' => v === 'pass' || v === 'fail');

      row[field] = verdicts.length ? verdicts.filter(v => v === 'pass').length / verdicts.length : null;
    });

    return row;
  };

  const displayRows: Row[] = useMemo(
    () =>
      sessionGroups.flatMap(([sessionId, rows]) => {
        const header = buildGroupRow(sessionId, rows);

        return collapsedSessions.has(sessionId) ? [header] : [header, ...rows];
      }),
    [sessionGroups, collapsedSessions],
  );

  const nameColumn: GridColDef = {
    field: 'name',
    headerName: 'Trace',
    flex: 1,
    minWidth: 220,
    headerAlign: 'left',
    align: 'left',
    sortable: false,
    renderCell: params => {
      const row = params.row as Row;

      if (row.isGroupHeader) {
        const collapsed = collapsedSessions.has(row.sessionId);

        return (
          <Box
            onClick={e => {
              e.stopPropagation();
              toggleSession(row.sessionId);
            }}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%', height: '100%', cursor: 'pointer' }}
          >
            {collapsed ? <ChevronRightRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
            <span>{row.count} trace{row.count === 1 ? '' : 's'}</span>
          </Box>
        );
      }

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <TruncMono max={row.annotatedCount ? 260 : 320}>{String(params.value ?? '')}</TruncMono>
          {Boolean(row.annotatedCount) && (
            <Tooltip title={`${row.annotatedCount} human annotation${row.annotatedCount === 1 ? '' : 's'} — ${TONE_LABEL[row.annotationTone ?? 'good']}`}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexShrink: 0, color: TONE_COLOR[row.annotationTone ?? 'good'] }}>
                {row.annotationTone === 'bad'
                  ? <FlagRoundedIcon sx={{ fontSize: 13 }} />
                  : <RateReviewRoundedIcon sx={{ fontSize: 13 }} />}
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem' }}>
                  {row.annotatedCount}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>
      );
    },
  };

  const sessionColumn: GridColDef = {
    field: 'sessionId',
    headerName: 'Session',
    width: 140,
    headerAlign: 'left',
    align: 'left',
    sortable: false,
    renderCell: params => {
      const sessionId = String(params.value ?? '');

      return <TruncMono max={120}>{runNameById?.[sessionId] ?? sessionId}</TruncMono>;
    },
  };

  const modelColumn: GridColDef = {
    field: 'model',
    headerName: 'Model',
    width: 160,
    headerAlign: 'left',
    align: 'left',
    sortable: false,
  };

  const judgeColumns: GridColDef[] = judgeMeta.map((j, i) => ({
    field: `judge__${i}`,
    width: 130,
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    renderHeader: () => (
      <Tooltip title={j.passRate === null ? 'No verdicts yet' : `${Math.round(j.passRate * 100)}% pass`}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', py: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {j.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: j.passRate === null ? 'text.secondary' : j.passRate >= 0.75 ? 'success.main' : 'warning.main',
            }}
          >
            {j.passRate === null ? '—' : `${Math.round(j.passRate * 100)}%`}
          </Typography>
          {j.passRate !== null && (
            <Box sx={{ width: '70%', height: 4, borderRadius: 2, bgcolor: 'error.main', overflow: 'hidden', mt: 0.25 }}>
              <Box sx={{ width: `${Math.round(j.passRate * 100)}%`, height: '100%', bgcolor: 'success.main' }} />
            </Box>
          )}
        </Box>
      </Tooltip>
    ),
    renderCell: params => {
      const row = params.row as Row;

      if (row.isGroupHeader) {
        const rate = params.value as number | null;

        return (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: rate === null ? 'text.secondary' : rate >= 0.75 ? 'success.main' : 'warning.main',
            }}
          >
            {rate === null ? 'n/a' : `${Math.round(rate * 100)}%`}
          </Typography>
        );
      }

      const v = params.value as JudgeVerdict;

      if (v === null || v === undefined) {
        return (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        );
      }

      return (
        <Chip
          size="small"
          label={v === 'pass' ? 'Pass' : 'Fail'}
          color={v === 'pass' ? 'success' : 'error'}
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
      );
    },
  }));

  const latencyColumn: GridColDef = {
    field: 'latencyMs',
    headerName: 'Latency',
    width: 110,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    sortable: false,
    renderCell: params => formatMs(Number(params.value ?? 0)),
  };

  const tokensColumn: GridColDef = {
    field: 'tokens',
    headerName: 'Tokens',
    width: 110,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    sortable: false,
    renderCell: params => Number(params.value ?? 0).toLocaleString(),
  };

  const costColumn: GridColDef = {
    field: 'cost',
    headerName: 'Cost',
    width: 110,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    sortable: false,
    renderCell: params => `$${Number(params.value ?? 0).toFixed(4)}`,
  };

  const timestampColumn: GridColDef = {
    field: 'timestamp',
    headerName: 'Created at',
    width: 170,
    headerAlign: 'right',
    align: 'right',
    sortable: false,
    renderCell: params => (params.value ? new Date(String(params.value)).toLocaleString() : ''),
  };

  const actionColumn: GridColDef = {
    field: 'rowAction',
    headerName: '',
    width: 64,
    sortable: false,
    filterable: false,
    align: 'center',
    headerAlign: 'center',
    headerClassName: 'datagrid-header-fixed',
    cellClassName: 'datagrid-header-fixed',
    renderCell: params => {
      const row = params.row as Row;

      if (row.isGroupHeader) {
        return (
          <Tooltip title="Open">
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                goToWorkflow(row.sessionId);
              }}
            >
              <LaunchRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      }

      return (
        <Tooltip title="Open trace">
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation();
              goToTrace(row);
            }}
          >
            <LaunchRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    },
  };

  const columns: GridColDef[] = [
    nameColumn,
    sessionColumn,
    modelColumn,
    ...judgeColumns,
    latencyColumn,
    tokensColumn,
    costColumn,
    timestampColumn,
    actionColumn,
  ];

  const columnGroupingModel = [
    {
      groupId: 'Trace',
      headerClassName: 'theme-parameters-group',
      children: [{ field: 'name' }, { field: 'sessionId' }, { field: 'model' }],
    },
    ...(judgeColumns.length > 0
      ? [{
        groupId: 'Judges',
        headerClassName: 'theme-parameters-group-2',
        children: judgeColumns.map(c => ({ field: c.field })),
      }]
      : []),
    {
      groupId: 'Usage',
      headerClassName: judgeColumns.length > 0 ? 'theme-parameters-group' : 'theme-parameters-group-2',
      children: [{ field: 'latencyMs' }, { field: 'tokens' }, { field: 'cost' }, { field: 'timestamp' }],
    },
    {
      groupId: 'Actions',
      headerClassName: 'datagrid-header-fixed',
      children: [{ field: 'rowAction' }],
    },
  ];

  return (
    <ResponsiveCardTable
      // title={`All traces (${traceRows.length})`}
      title=""
      noPadding
      headerActions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedTraceIds && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${filteredRows.length} of ${traceRows.length} traces (from chart)`}
              onDelete={onClearSelection}
            />
          )}
        </Box>
      }
    >
      {traceRows.length === 0 ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <EmptyNote>No traces.</EmptyNote>
        </Box>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <EmptyNote>No traces in the selected bucket.</EmptyNote>
        </Box>
      ) : (
        <Box sx={{ height: 560, width: '100%' }}>
          <StyledDataGrid
            density="compact"
            disableColumnMenu
            disableColumnResize
            disableRowSelectionOnClick
            getRowClassName={params => ((params.row as Row).isGroupHeader ? 'trace-group-row' : '')}
            rows={displayRows}
            columns={columns}
            columnGroupingModel={columnGroupingModel}
            rowHeight={44}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              width: '100%',
              height: '100%',

              '& .trace-group-row': {
                bgcolor: 'action.hover',
                fontWeight: 700,
              },

              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                outline: 'none',
              },

              '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within': {
                outline: 'none',
              },
            }}
          />
        </Box>
      )}
    </ResponsiveCardTable>
  );
}
