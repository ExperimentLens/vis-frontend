import { Box, Button, Chip, Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import ObservationWaterfall from '../../../Tasks/Observability/trace-observation-waterfall';
import { PassFailChip } from '../../../Tasks/Observability/trace-ui';
import { formatMs, MONO } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceRow } from '../../../../shared/utils/trace-explorer';

interface Props {
  row: TraceRow;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onOpenFull: () => void;
  compareOpen: boolean;
  onToggleCompare: () => void;
  /** The baseline comparison, rendered when compareOpen. */
  compare: React.ReactNode;
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack spacing={0.5}>
    <Typography variant="captionLabel" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
    {children}
  </Stack>
);

/** The selected trace without leaving the list: question, answer, every verdict and the steps. */
export default function TracePeekPanel({ row, position, total, onPrev, onNext, onClose, onOpenFull, compareOpen, onToggleCompare, compare }: Props) {
  // Failed checks first: they are why you opened this trace.
  const judges = [...row.judges].sort((a, b) => Number(a.passed) - Number(b.passed));

  return (
    <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 1.5, overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontFamily: MONO, fontWeight: 700 }} noWrap title={row.runName}>{row.variant}</Typography>
        {row.caseId !== '—' && <Chip size="small" variant="outlined" label={`case ${row.caseId}`} sx={{ height: 20 }} />}
        {row.status === 'error' && <Chip size="small" color="error" label="ERROR" sx={{ height: 20, fontWeight: 700 }} />}
        {row.judges.length > 0 && (
          <PassFailChip
            passed={row.failedChecks.length === 0}
            label={`${row.failedChecks.length ? 'FAIL' : 'PASS'} ${row.judges.length - row.failedChecks.length}/${row.judges.length}`}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{position} of {total}</Typography>
        <Tooltip title="Previous (↑)"><span><IconButton size="small" onClick={onPrev} disabled={position <= 1}><KeyboardArrowUpRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="Next (↓)"><span><IconButton size="small" onClick={onNext} disabled={position >= total}><KeyboardArrowDownRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="Close (Esc)"><IconButton size="small" onClick={onClose}><CloseRoundedIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>

      <Stack spacing={2} sx={{ p: 1.5, overflow: 'auto', flex: 1 }}>
        <Section label="Question">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.question}</Typography>
        </Section>

        {row.expected && (
          <Section label="Expected answer">
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.expected}</Typography>
          </Section>
        )}

        {compareOpen ? (
          <Section label="Compared with another variant">{compare}</Section>
        ) : (
          <Section label="Answer">
            <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.answer}</Typography>
            </Box>
          </Section>
        )}

        {judges.length > 0 && (
          <Section label={`Checks · ${row.failedChecks.length} failed`}>
            <Stack spacing={0.75}>
              {judges.map(j => (
                <Stack key={j.name} direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flexShrink: 0, pt: 0.25 }}><PassFailChip passed={j.passed} label={j.passed ? 'PASS' : 'FAIL'} /></Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{j.name}</Typography>
                    {j.rationale && <Typography variant="caption" color="text.secondary">{j.rationale}</Typography>}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Section>
        )}

        <Section label={`Steps · ${formatMs(row.latencyMs)}${row.tokens ? ` · ${row.tokens.toLocaleString()} tokens` : ''}`}>
          <ObservationWaterfall observations={row.trace.observations} />
        </Section>
      </Stack>

      <Divider />
      <Stack direction="row" spacing={1} sx={{ p: 1, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant={compareOpen ? 'contained' : 'outlined'}
          startIcon={<CompareArrowsRoundedIcon />}
          onClick={onToggleCompare}
        >
          {compareOpen ? 'Hide comparison' : 'Compare with baseline'}
        </Button>
        <Button size="small" startIcon={<LaunchRoundedIcon />} onClick={onOpenFull}>Open full trace</Button>
      </Stack>
    </Paper>
  );
}
