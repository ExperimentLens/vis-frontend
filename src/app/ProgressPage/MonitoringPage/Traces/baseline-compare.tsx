import { useState } from 'react';
import { Box, Chip, IconButton, Stack, Typography, alpha, useTheme } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import SearchableSelect from '../../../../shared/components/searchable-select';
import { PassFailChip } from '../../../Tasks/Observability/trace-ui';
import { MONO } from '../../../../shared/models/observability/agentic-conventions';
import { checkDiff, counterparts } from '../../../../shared/utils/trace-explorer';
import type { TraceRow } from '../../../../shared/utils/trace-explorer';

interface Props {
  row: TraceRow;
  allRows: TraceRow[];
  variants: string[];
  compareVariant: string;
  onCompareVariantChange: (variant: string) => void;
}

const Verdict = ({ passed }: { passed: boolean | null }) =>
  passed === null
    ? <Typography variant="caption" color="text.disabled">not run</Typography>
    : <PassFailChip passed={passed} label={passed ? 'PASS' : 'FAIL'} />;

/** The same case under another variant: both answers side by side and which checks flipped. */
export default function BaselineCompare({ row, allRows, variants, compareVariant, onCompareVariantChange }: Props) {
  const theme = useTheme();
  const [repeat, setRepeat] = useState(0);
  const others = variants.filter(v => v !== row.variant);
  const target = others.includes(compareVariant) ? compareVariant : others[0] ?? '';
  const matches = target ? counterparts(allRows, row, target) : [];
  const other = matches[Math.min(repeat, matches.length - 1)];

  if (row.caseId === '—') {
    return <Typography variant="caption" color="text.secondary">This trace has no case id, so there is nothing to line it up with.</Typography>;
  }

  const diff = other ? checkDiff(row, other) : [];
  const flipped = diff.filter(d => d.baseline !== d.current).length;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ width: 220 }}>
          <SearchableSelect
            labelId="trace-compare-variant"
            inputLabel="Compare with"
            label="Compare with"
            value={target}
            options={others}
            onChange={v => { setRepeat(0); onCompareVariantChange(v); }}
            menuMaxHeight={300}
          />
        </Box>
        {matches.length > 1 && (
          <Stack direction="row" alignItems="center">
            <IconButton size="small" disabled={repeat === 0} onClick={() => setRepeat(r => r - 1)}><ChevronLeftRoundedIcon fontSize="small" /></IconButton>
            <Typography variant="caption" color="text.secondary">repeat {Math.min(repeat, matches.length - 1) + 1} of {matches.length}</Typography>
            <IconButton size="small" disabled={repeat >= matches.length - 1} onClick={() => setRepeat(r => r + 1)}><ChevronRightRoundedIcon fontSize="small" /></IconButton>
          </Stack>
        )}
      </Stack>

      {!other ? (
        <Typography variant="caption" color="text.secondary">{target} has no trace for case {row.caseId}.</Typography>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {[{ label: target, r: other }, { label: row.variant, r: row }].map(({ label, r }) => (
              <Box key={label} sx={{ minWidth: 0, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="caption" sx={{ fontFamily: MONO, fontWeight: 700, display: 'block', mb: 0.5 }}>{label}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.answer}</Typography>
              </Box>
            ))}
          </Box>

          {diff.length > 0 && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {flipped ? `${flipped} check${flipped === 1 ? '' : 's'} changed` : 'Same verdict on every check'}
              </Typography>
              {diff.map(d => {
                const changed = d.baseline !== d.current;

                return (
                  <Stack
                    key={d.name}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: changed ? alpha(d.current === false ? theme.palette.error.main : theme.palette.success.main, 0.08) : 'transparent',
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, fontWeight: changed ? 700 : 400 }}>{d.name}</Typography>
                    <Verdict passed={d.baseline} />
                    <Typography variant="caption" color="text.disabled">→</Typography>
                    <Verdict passed={d.current} />
                    {changed && <Chip size="small" label={d.current === false ? 'got worse' : 'got better'} color={d.current === false ? 'error' : 'success'} variant="outlined" sx={{ height: 20 }} />}
                  </Stack>
                );
              })}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
