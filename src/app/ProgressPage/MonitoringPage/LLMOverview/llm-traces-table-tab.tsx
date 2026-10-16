import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, IconButton, InputAdornment, Paper, Stack, TextField, Toolbar, Tooltip, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import InfoMessage from '../../../../shared/components/InfoMessage';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { getCache, removeCache } from '../../../../shared/utils/localStorageCache';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import { caseGrid, defaultBaseline, FILTER_QUERY_KEYS, filterOptions, filterTraceRows, filtersFromQuery, filtersToQuery, toTraceRows } from '../../../../shared/utils/trace-explorer';
import type { GridCell, TraceFilters } from '../../../../shared/utils/trace-explorer';
import BaselineCompare from '../Traces/baseline-compare';
import CaseGridView from '../Traces/case-grid';
import TraceFiltersButton from '../Traces/trace-filters-button';
import TraceList from '../Traces/trace-list';
import TracePeekPanel from '../Traces/trace-peek-panel';
import { useLlmSessionTraces } from './use-llm-session-traces';

/**
 * Traces tab: every trace as question → answer → verdicts, filterable by what the
 * experiment varied, with a side panel to read one without leaving the list.
 * Filters can come from the URL (variant, case, status, check, q), so other views can
 * link straight to e.g. "contact_footer traces that failed pii leakage".
 */
export default function LlmTracesTableTab() {
  const { experimentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const traceSelectionId = query.get('traceSelectionId');

  const { workflowIds, allDetails, anyLoading, hasData, refresh } = useLlmSessionTraces();
  const runs = useAppSelector((s: RootState) => s.progressPage.workflows.data);

  const [filters, setFilters] = useState<TraceFilters>(() => filtersFromQuery(query));
  const [chartTraceIds, setChartTraceIds] = useState<string[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'grid'>(query.get('view') === 'grid' ? 'grid' : 'list');
  const [cell, setCell] = useState<{ caseId: string; variant: string } | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareVariant, setCompareVariant] = useState('');

  // Keep filters and view in the URL, so a link or a reload shows the same traces.
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    FILTER_QUERY_KEYS.forEach(key => params.delete(key));
    params.delete('view');
    filtersToQuery(filters).forEach((value, key) => params.set(key, value));
    if (view === 'grid') params.set('view', 'grid');
    if (params.toString() !== new URLSearchParams(location.search).toString()) {
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [filters, view]);

  // Traces picked from a time bucket on the Performance charts.
  useEffect(() => {
    if (!traceSelectionId) return;
    const cached = getCache<{ traceIds: string[] }>(traceSelectionId);

    if (cached?.traceIds) setChartTraceIds(cached.traceIds);
  }, [traceSelectionId]);

  const allRows = useMemo(() => toTraceRows(allDetails, runs), [allDetails, runs]);
  const options = useMemo(() => filterOptions(allRows), [allRows]);
  const rows = useMemo(() => {
    const scoped = chartTraceIds ? allRows.filter(r => chartTraceIds.includes(r.id)) : allRows;

    return filterTraceRows(scoped, filters);
  }, [allRows, chartTraceIds, filters]);

  const grid = useMemo(() => caseGrid(rows), [rows]);
  // In the grid, the panel steps through the clicked cell's traces (its repeats).
  const navRows = view === 'grid' && cell ? grid.cell(cell.caseId, cell.variant)?.rows ?? [] : rows;
  const index = navRows.findIndex(r => r.id === selectedId);
  const selected = index >= 0 ? navRows[index] : null;

  const selectCell = (c: GridCell) => {
    setCell({ caseId: c.caseId, variant: c.variant });
    setSelectedId(c.rows[0]?.id ?? null);
  };

  const move = (step: number) => {
    const next = navRows[index + step];

    if (next) setSelectedId(next.id);
  };

  // ↑/↓ step through the list and Esc closes the panel, unless typing in a field.
  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      if (e.key === 'Escape') { setSelectedId(null); setCell(null); }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  });

  const clearChartSelection = () => {
    setChartTraceIds(null);
    if (!traceSelectionId) return;
    removeCache(traceSelectionId);
    const params = new URLSearchParams(location.search);

    params.delete('traceSelectionId');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  if (workflowIds.length === 0) {
    return (
      <InfoMessage
        message="No completed runs to show traces for yet."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  const failing = allRows.filter(r => r.status === 'fail' || r.status === 'error').length;

  // Same shape as the Sessions table: a dense toolbar on the card, view switch on the left,
  // search and icon actions (filters, refresh) on the right.
  const toolbar = (
    <Toolbar
      variant="dense"
      sx={{ minHeight: 44, height: 44, '@media (min-width:600px)': { minHeight: 44, height: 44 }, flex: '0 0 auto', gap: 1, px: 1.5, borderBottom: 1, borderColor: 'divider' }}
    >
      <SegmentedToggle
        uppercase
        aria-label="Traces view"
        value={view}
        onChange={v => { setView(v as 'list' | 'grid'); setSelectedId(null); setCell(null); }}
        options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Case grid' }]}
      />
      <Typography variant="caption" color="text.secondary" noWrap sx={{ ml: 0.5, minWidth: 0 }}>
        {rows.length === allRows.length ? `${allRows.length} traces` : `${rows.length} of ${allRows.length} traces`} · {failing} failing
      </Typography>
      {anyLoading && <CircularProgress size={14} />}
      <Box sx={{ flex: 1 }} />
      {chartTraceIds && (
        <Chip size="small" color="primary" variant="outlined" label={`${chartTraceIds.length} from chart`} onDelete={clearChartSelection} />
      )}
      <TextField
        id="trace-search"
        size="small"
        placeholder="Search questions and answers"
        value={filters.search}
        onChange={e => setFilters({ ...filters, search: e.target.value })}
        sx={{ width: { xs: 160, md: 240 }, '& .MuiInputBase-root': { height: 30, fontSize: '0.8rem' } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
      />
      <TraceFiltersButton filters={filters} onChange={setFilters} options={options} />
      <Tooltip title="Refresh traces">
        <span>
          <IconButton size="small" onClick={refresh} disabled={anyLoading}>
            <RefreshRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Toolbar>
  );

  return (
    <Stack direction="row" spacing={1.25} sx={{ flex: 1, minHeight: 0 }}>
      <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, borderRadius: 1.5, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {toolbar}

        {!hasData && anyLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">Fetching traces…</Typography>
          </Stack>
        )}

        {!hasData && !anyLoading && (
          <InfoMessage
            message="No traces found for this experiment's runs."
            type="info"
            icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
            fullHeight
          />
        )}

        {hasData && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {view === 'grid' && rows.length > 0 ? (
              <CaseGridView grid={grid} selected={cell} onSelect={selectCell} />
            ) : rows.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, gap: 1 }}>
                <Typography variant="body2" color="text.secondary">No traces match these filters.</Typography>
              </Stack>
            ) : (
              <TraceList rows={rows} selectedId={selectedId} onSelect={setSelectedId} compact={Boolean(selected)} />
            )}
          </Box>
        )}
      </Paper>

      {selected && (
        <Box sx={{ width: { xs: '100%', lg: '46%' }, flexShrink: 0, minHeight: 0 }}>
          <TracePeekPanel
            row={selected}
            position={index + 1}
            total={navRows.length}
            onPrev={() => move(-1)}
            onNext={() => move(1)}
            onClose={() => { setSelectedId(null); setCell(null); }}
            compareOpen={compareOpen}
            onToggleCompare={() => setCompareOpen(o => !o)}
            compare={(
              <BaselineCompare
                key={selected.id}
                row={selected}
                allRows={allRows}
                variants={options.variants}
                compareVariant={compareVariant || defaultBaseline(options.variants)}
                onCompareVariantChange={setCompareVariant}
              />
            )}
            onOpenFull={() => navigate(`/${experimentId}/workflow?workflowId=${selected.sessionId}&traceId=${selected.id}`)}
          />
        </Box>
      )}
    </Stack>
  );
}
