import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import { MONO } from '../../../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import SegmentedToggle from '../../../../../shared/components/segmented-toggle';
import { exportElementToPng } from '../../../../../shared/utils/export-png';
import { alignVerdictDetails } from './trajectory-alignment';
import type { AlignedVerdictDetail } from './trajectory-alignment';

type Props = {
  byRun: Record<string, TraceDetail>;
  runIds: string[];
  runNameById: Record<string, string>;
  colorById: Record<string, string>;
  baselineId: string;
};

export default function VerdictMatrix({ byRun, runIds, runNameById, colorById, baselineId }: Props) {
  const theme = useTheme();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [changesOnly, setChangesOnly] = useState(false);
  const [selected, setSelected] = useState<{ name: string; kind: 'judges' | 'checks' } | null>(null);

  const verdicts = useMemo<AlignedVerdictDetail[]>(
    () => [...alignVerdictDetails(byRun, 'judges'), ...alignVerdictDetails(byRun, 'checks')],
    [byRun],
  );

  const isRegression = (v: AlignedVerdictDetail) =>
    v.byRun[baselineId]?.passed === true && runIds.some(id => id !== baselineId && v.byRun[id]?.passed === false);
  const isFix = (v: AlignedVerdictDetail) =>
    v.byRun[baselineId]?.passed === false && runIds.some(id => id !== baselineId && v.byRun[id]?.passed === true);
  const changed = (v: AlignedVerdictDetail) => {
    const base = v.byRun[baselineId]?.passed;
    return runIds.some(id => id !== baselineId && v.byRun[id] && v.byRun[id].passed !== base);
  };

  const regressionCount = verdicts.filter(isRegression).length;
  const fixCount = verdicts.filter(isFix).length;

  useEffect(() => {
    const firstRegression = verdicts.find(isRegression);
    const fallback = verdicts[0];

    setSelected(
      firstRegression
        ? { name: firstRegression.name, kind: firstRegression.kind }
        : fallback ? { name: fallback.name, kind: fallback.kind } : null,
    );
  }, [byRun, baselineId]);

  const visible = changesOnly ? verdicts.filter(changed) : verdicts;
  const judgeRows = visible.filter(v => v.kind === 'judges');
  const checkRows = visible.filter(v => v.kind === 'checks');
  const selectedDetail = verdicts.find(v => selected && v.name === selected.name && v.kind === selected.kind);

  const cols = `minmax(150px, 1.4fr) repeat(${runIds.length}, minmax(72px, 1fr))`;

  const handleDownload = () => {
    if (gridRef.current) {
      exportElementToPng(gridRef.current, `verdict-diff-${new Date().toISOString().split('T')[0]}.png`, theme.palette.background.paper);
    }
  };

  const RunHead = ({ id }: { id: string }) => (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ minWidth: 0, py: 0.5 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorById[id], flexShrink: 0 }} />
      <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={runNameById[id] ?? id}>
        {runNameById[id] ?? id}
      </Typography>
      {id === baselineId && <Chip label="base" size="small" sx={{ height: 14, fontSize: '0.5rem' }} />}
    </Stack>
  );

  return (
    <ResponsiveCardTable
      title="Verdict diff"
      details="click a cell to compare rationales"
      showSettings={false}
      showFullScreenButton={false}
      showDownloadButton={verdicts.length > 0}
      onDownload={handleDownload}
      downloadLabel="Download as PNG"
      headerActions={
        <Stack direction="row" spacing={0.75} alignItems="center">
          {regressionCount > 0 && <Chip size="small" label={`${regressionCount} regression${regressionCount === 1 ? '' : 's'}`} color="error" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
          {fixCount > 0 && <Chip size="small" label={`${fixCount} fix${fixCount === 1 ? '' : 'es'}`} color="info" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
          <SegmentedToggle aria-label="filter" value={changesOnly ? 'changes' : 'all'} onChange={v => setChangesOnly(v === 'changes')} options={[{ value: 'all', label: 'All' }, { value: 'changes', label: 'Changes' }]} />
        </Stack>
      }
    >
      {visible.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          {changesOnly ? 'No verdicts changed vs. baseline.' : 'No verdicts for this question.'}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          <Box ref={gridRef} sx={{ overflow: 'auto' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: cols, gap: 0.5, minWidth: 380, alignItems: 'center' }}>
              <Box />
              {runIds.map(id => <RunHead key={id} id={id} />)}
              {[{ label: 'JUDGES', rows: judgeRows }, { label: 'CHECKS', rows: checkRows }].map(group =>
                group.rows.length === 0 ? null : (
                  <Box key={group.label} sx={{ display: 'contents' }}>
                    <Box sx={{ gridColumn: '1 / -1', pt: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.58rem', letterSpacing: '0.5px' }}>{group.label}</Typography>
                    </Box>
                    {group.rows.map(v => {
                      const accent = isRegression(v) ? theme.palette.error.main : isFix(v) ? theme.palette.info.main : 'transparent';
                      return (
                        <Box key={`${v.kind}-${v.name}`} sx={{ display: 'contents' }}>
                          <Box sx={{ borderLeft: `3px solid ${accent}`, pl: 0.75, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={v.name}>{v.name}</Typography>
                          </Box>
                          {runIds.map(id => (
                            <HeatCell
                              key={id}
                              passed={v.byRun[id]?.passed}
                              selected={selected?.name === v.name && selected?.kind === v.kind}
                              onClick={() => setSelected({ name: v.name, kind: v.kind })}
                            />
                          ))}
                        </Box>
                      );
                    })}
                  </Box>
                ),
              )}
            </Box>
          </Box>

          {selectedDetail && (
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                Rationale · {selectedDetail.name}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0.75, mt: 0.75 }}>
                {runIds.map(id => {
                  const cell = selectedDetail.byRun[id];
                  const color = cell?.passed === undefined ? theme.palette.text.disabled : cell.passed ? theme.palette.success.main : theme.palette.error.main;
                  return (
                    <Box key={id} sx={{ borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, borderLeft: `3px solid ${color}`, p: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colorById[id] }} />
                        <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{runNameById[id] ?? id}</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography component="span" sx={{ fontFamily: MONO, fontSize: '0.6rem', fontWeight: 700, color }}>
                          {cell?.passed === undefined ? '—' : cell.passed ? 'PASS' : 'FAIL'}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {cell?.rationale || (cell ? 'No rationale recorded.' : 'Not present in this run.')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Stack>
      )}
    </ResponsiveCardTable>
  );
}

const HeatCell = ({ passed, selected, onClick }: { passed: boolean | undefined; selected: boolean; onClick: () => void }) => {
  const theme = useTheme();
  const na = passed === undefined;
  const color = na ? theme.palette.text.disabled : passed ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Box
      onClick={onClick}
      sx={{
        height: 28,
        borderRadius: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: '0.8rem',
        color,
        bgcolor: na ? theme.palette.action.hover : alpha(color, 0.16),
        border: selected ? `2px solid ${color}` : `1px solid ${na ? theme.palette.divider : alpha(color, 0.35)}`,
        m: selected ? 0 : '1px',
        transition: 'transform 0.1s ease',
        '&:hover': { transform: 'translateY(-1px)' },
      }}
    >
      {na ? '—' : passed ? '✓' : '✗'}
    </Box>
  );
}
