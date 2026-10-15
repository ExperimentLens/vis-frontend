import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { MONO } from '../../../../shared/models/observability/agentic-conventions';
import type { CaseGrid, GridCell } from '../../../../shared/utils/trace-explorer';

interface Props {
  grid: CaseGrid;
  selected: { caseId: string; variant: string } | null;
  onSelect: (cell: GridCell) => void;
}

const headSx = { fontSize: '0.68rem', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', py: 0.75, bgcolor: 'background.paper' } as const;

/**
 * Cases down, variants across: a red column is a configuration problem, a red row is a
 * problem with the case itself. Each cell pools the checks of every repeat.
 */
export default function CaseGridView({ grid, selected, onSelect }: Props) {
  const theme = useTheme();

  // By share of traces that failed (not pooled checks): one failed check in every repeat
  // is a consistent problem and should read red, even if most other checks passed.
  const toneOf = (cell: GridCell) => {
    if (!cell.totalChecks && !cell.errors) return theme.palette.text.disabled;
    const bad = (cell.failing + cell.errors) / cell.rows.length;

    if (bad === 0) return theme.palette.success.main;

    return bad >= 0.5 ? theme.palette.error.main : theme.palette.warning.main;
  };

  const labelOf = (cell: GridCell) => {
    const bad = cell.failing + cell.errors;

    if (cell.errors === cell.rows.length) return 'error';

    return bad ? `${bad}/${cell.rows.length} fail` : `${cell.passedChecks}/${cell.totalChecks}`;
  };

  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, borderRadius: 1.5, overflow: 'auto' }}>
      <Table size="small" stickyHeader sx={{ borderCollapse: 'separate' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headSx, position: 'sticky', left: 0, zIndex: 3, minWidth: 220 }}>Case</TableCell>
            {grid.variants.map((v, i) => (
              <TableCell key={v} align="center" sx={{ ...headSx, fontFamily: MONO }}>
                {v}
                {i === 0 && <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>(baseline)</Typography>}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {grid.cases.map(({ caseId, question }) => (
            <TableRow key={caseId}>
              <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, maxWidth: 280, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontFamily: MONO, fontWeight: 700 }}>{caseId}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div" title={question}>{question}</Typography>
              </TableCell>
              {grid.variants.map(variant => {
                const cell = grid.cell(caseId, variant);

                if (!cell) {
                  return <TableCell key={variant} align="center"><Typography variant="caption" color="text.disabled">—</Typography></TableCell>;
                }
                const tone = toneOf(cell);
                const isSelected = selected?.caseId === caseId && selected.variant === variant;

                return (
                  <TableCell key={variant} align="center" sx={{ p: 0.5 }}>
                    <Tooltip
                      title={`${cell.rows.length} trace${cell.rows.length === 1 ? '' : 's'} · ${cell.passedChecks}/${cell.totalChecks} checks passed`
                        + `${cell.failing ? ` · ${cell.failing} failed a check` : ''}${cell.errors ? ` · ${cell.errors} errored` : ''}`}
                    >
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(cell)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(cell); }}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 1,
                          py: 0.75,
                          px: 1,
                          bgcolor: alpha(tone, 0.16),
                          border: `1.5px solid ${isSelected ? tone : alpha(tone, 0.25)}`,
                          boxShadow: isSelected ? `0 0 0 3px ${alpha(tone, 0.2)}` : 'none',
                          '&:hover, &:focus-visible': { borderColor: tone, outline: 'none' },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontFamily: MONO, fontWeight: 700, color: tone }}>
                          {labelOf(cell)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {cell.failing + cell.errors ? `${cell.passedChecks}/${cell.totalChecks} checks` : `${cell.rows.length} trace${cell.rows.length === 1 ? '' : 's'}`}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
