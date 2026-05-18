import { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Tooltip,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { MOCK_TRACES } from './mock-data';
import type { ITrace } from './mock-data';
import TraceWaterfall from './trace-waterfall';

const StatusChip = ({ ok }: { ok: boolean }) => {
  const theme = useTheme();
  const color = ok ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.15,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color,
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.3px',
      }}
    >
      {ok ? <CheckCircleRoundedIcon sx={{ fontSize: 12 }} /> : <CancelRoundedIcon sx={{ fontSize: 12 }} />}
      {ok ? 'OK' : 'ERROR'}
    </Box>
  );
};

const JudgeBadge = ({ name, passed }: { name: string; passed: boolean }) => {
  const theme = useTheme();
  const color = passed ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Tooltip title={`${name}: ${passed ? 'pass' : 'fail'}`} arrow>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          border: `1px solid ${alpha(color, 0.5)}`,
        }}
      />
    </Tooltip>
  );
};

const TracesTab = () => {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string>(MOCK_TRACES[0].id);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error'>('all');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return MOCK_TRACES.filter(t => {
      if (statusFilter === 'ok' && t.status !== 'OK') return false;
      if (statusFilter === 'error' && t.status !== 'ERROR') return false;
      if (!q) return true;
      return (
        t.question.toLowerCase().includes(q) ||
        t.runName.toLowerCase().includes(q) ||
        t.answer.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [filter, statusFilter]);

  const trace: ITrace =
    MOCK_TRACES.find(t => t.id === selectedId) ?? MOCK_TRACES[0];

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 1.5, minHeight: 0 }}>
      {/* Trace list */}
      <Paper
        variant="outlined"
        sx={{
          width: 360,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Box sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search traces"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={statusFilter}
            onChange={(_, v) => v && setStatusFilter(v)}
            fullWidth
            sx={{ '& .MuiToggleButton-root': { fontSize: '0.7rem', py: 0.25 } }}
          >
            <ToggleButton value="all">All ({MOCK_TRACES.length})</ToggleButton>
            <ToggleButton value="ok">OK</ToggleButton>
            <ToggleButton value="error">Errors</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filtered.map(t => {
            const judges = t.assessments.filter(a => a.kind === 'judge');
            const isSelected = t.id === selectedId;
            return (
              <Box
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: 'pointer',
                  borderLeft: `3px solid ${isSelected ? theme.palette.primary.main : 'transparent'}`,
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:hover': { bgcolor: theme.palette.action.hover },
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                  <StatusChip ok={t.status === 'OK'} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                      color: 'text.secondary',
                      fontSize: '0.65rem',
                    }}
                  >
                    {t.id}
                  </Typography>
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 0.25 }}>
                    {judges.map(j => (
                      <JudgeBadge key={j.name} name={j.name} passed={!!j.passed} />
                    ))}
                  </Box>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.25,
                  }}
                  title={t.question}
                >
                  {t.question}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                    {t.runName.split('__')[0]}
                  </Typography>
                  <Stack direction="row" spacing={0.25} alignItems="center" sx={{ ml: 'auto' }}>
                    <TimerOutlinedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                      {t.totalLatencyMs}ms
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <TokenRoundedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                      {t.totalTokens}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
          {filtered.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No traces match this filter.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Trace detail */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {trace.question}
            </Typography>
            <StatusChip ok={trace.status === 'OK'} />
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
              <Chip size="small" label={trace.ragName} variant="outlined" />
              <Chip size="small" label={trace.promptName} variant="outlined" />
              <Chip size="small" label={trace.model} variant="outlined" />
            </Box>
          </Stack>
          <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
            <Stat label="Latency" value={`${trace.totalLatencyMs}ms`} />
            <Stat label="Tokens (prompt / completion)" value={`${trace.promptTokens} / ${trace.completionTokens}`} />
            <Stat label="Total" value={`${trace.totalTokens}`} />
            <Stat label="Started" value={new Date(trace.startedAt).toLocaleString()} />
          </Stack>
        </Box>

        {/* Waterfall */}
        <Section title="Span waterfall">
          <TraceWaterfall spans={trace.spans} totalDurationMs={trace.totalLatencyMs} />
        </Section>

        {/* Q + A + ground truth */}
        <Section title="Question · Answer · Ground truth">
          <Stack spacing={1.25}>
            <KVRow label="Question" value={trace.question} />
            <KVRow label="Answer" value={trace.answer || '(empty)'} highlight />
            <KVRow label="Ground truth" value={trace.groundTruth} />
          </Stack>
        </Section>

        {/* Retrieved docs */}
        <Section title={`Retrieved context (${trace.retrieved.length})`}>
          {trace.retrieved.length === 0 && (
            <Typography variant="caption" color="text.secondary">No documents retrieved.</Typography>
          )}
          <Stack spacing={1}>
            {trace.retrieved.map((doc, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{ p: 1.25, bgcolor: alpha(theme.palette.info.main, 0.04) }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip size="small" label={`[${i + 1}] ${doc.source}`} sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                    score: {doc.score.toFixed(2)}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {doc.text}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Section>

        {/* Final prompt */}
        <Section
          title="Final rendered prompt"
          action={
            <Tooltip title="Copy prompt" arrow>
              <IconButton size="small" onClick={() => navigator.clipboard?.writeText(trace.prompt)}>
                <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          }
        >
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.25,
              fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              fontSize: '0.72rem',
              bgcolor: theme.palette.customSurface.tray,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {trace.prompt}
          </Box>
        </Section>

        {/* Assessments */}
        <Section title="Judge & scorer assessments">
          <Stack spacing={0.75}>
            {trace.assessments.map(a => {
              const isBool = a.value === 'yes' || a.value === 'no';
              const passed = a.passed;
              const color =
                isBool && passed === true ? theme.palette.success.main :
                  isBool && passed === false ? theme.palette.error.main :
                    theme.palette.text.secondary;
              return (
                <Stack
                  key={a.name}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: isBool ? alpha(color, 0.04) : 'transparent',
                  }}
                >
                  <Box sx={{ minWidth: 160 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                      {a.name}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.6rem' }}>
                      {a.kind}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.15,
                      borderRadius: 999,
                      bgcolor: alpha(color, 0.14),
                      color,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                      flexShrink: 0,
                    }}
                  >
                    {String(a.value)}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    {a.rationale}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Section>
      </Paper>
    </Box>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
      {value}
    </Typography>
  </Box>
);

const Section = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'text.secondary',
          }}
        >
          {title}
        </Typography>
        {action && <Box sx={{ ml: 'auto' }}>{action}</Box>}
      </Stack>
      {children}
    </Box>
  );
};

const KVRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => {
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Typography
        variant="caption"
        sx={{
          minWidth: 110,
          color: 'text.secondary',
          textTransform: 'uppercase',
          fontWeight: 700,
          fontSize: '0.65rem',
          letterSpacing: '0.4px',
          pt: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: highlight ? 600 : 400,
          color: highlight ? theme.palette.primary.main : 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
};

export default TracesTab;
