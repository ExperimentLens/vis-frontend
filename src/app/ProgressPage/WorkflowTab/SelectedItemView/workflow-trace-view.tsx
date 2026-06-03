import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import type { Observation } from '../../../../shared/models/observability/observation';
import type { Score } from '../../../../shared/models/observability/score';
import { useAppSelector } from '../../../../store/store';
import type { RootState } from '../../../../store/store';
import InfoMessage from '../../../../shared/components/InfoMessage';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import ObservationWaterfall, { colorForType } from './trace-observation-waterfall';
import StatTile from '../../../../shared/components/stat-tile';
import {
  MONO,
  asText,
  durationOf,
  formatMs,
  isJudge,
  modelOf,
  prettyName,
  tokensOf,
} from '../../../../shared/models/observability/agentic-conventions';
import type {
  GenInput,
  GenOutput,
  TraceInput,
  TraceOutput,
} from '../../../../shared/models/observability/agentic-conventions';
import Loader from '../../../../shared/components/loader';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';

const SectionLabel = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <Stack direction="row" alignItems="center" sx={{ mb: 0.75, minHeight: 24 }}>
    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
      {children}
    </Typography>
    {action && <Box sx={{ ml: 'auto' }}>{action}</Box>}
  </Stack>
);

const CodeBlock = ({ children, maxHeight = 220 }: { children: string; maxHeight?: number }) => {
  const theme = useTheme();

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.25,
        fontFamily: MONO,
        fontSize: '0.72rem',
        lineHeight: 1.5,
        bgcolor: theme.palette.customSurface.tray,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight,
        overflow: 'auto',
      }}
    >
      {children}
    </Box>
  );
};

const CopyButton = ({ text }: { text: string }) => (
  <Tooltip title="Copy" arrow>
    <IconButton size="small" onClick={() => navigator.clipboard?.writeText(text)}>
      <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
    </IconButton>
  </Tooltip>
);

const PassFailChip = ({ passed, label, tooltip }: { passed: boolean; label: string; tooltip?: string }) => {
  const theme = useTheme();
  const color = passed ? theme.palette.success.main : theme.palette.error.main;

  const chip = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.85,
        py: 0.3,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color,
        border: `1px solid ${alpha(color, 0.3)}`,
        fontFamily: MONO,
        fontSize: '0.68rem',
        fontWeight: 700,
        maxWidth: '100%',
      }}
    >
      {passed ? <CheckCircleRoundedIcon sx={{ fontSize: 13 }} /> : <CancelRoundedIcon sx={{ fontSize: 13 }} />}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Box>
    </Box>
  );

  return tooltip ? <Tooltip title={tooltip} arrow>{chip}</Tooltip> : chip;
};

const MetaChip = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Tooltip title={label} arrow>
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.62rem' }}>
          <Box component="span" sx={{ opacity: 0.6, mr: 0.5 }}>{label}</Box>
          {value}
        </Box>
      }
      variant="outlined"
      sx={{ height: 20 }}
    />
  </Tooltip>
);

const Collapsible = ({
  title,
  meta,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setOpen(o => !o)}
        sx={{ px: 1.25, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}
      >
        <ExpandMoreRoundedIcon
          sx={{ fontSize: 18, color: 'text.secondary', transition: 'transform 0.15s ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: MONO }}>{title}</Typography>
        {meta}
        {action && <Box sx={{ ml: 'auto' }} onClick={e => e.stopPropagation()}>{action}</Box>}
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 1.25, pb: 1.25 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
};

/* ---------- span detail (timeline drill-down) ---------- */

const SpanDetail = ({ obs }: { obs: Observation }) => {
  const theme = useTheme();
  const input = obs.input as GenInput;
  const output = obs.output as GenOutput;
  const model = modelOf(obs);
  const tokens = (obs.output as GenOutput)?.tokens;
  const color = colorForType(obs.type);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, borderColor: alpha(color, 0.4) }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: MONO }}>{obs.name}</Typography>
        <Chip size="small" label={obs.type} sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(color, 0.12), color }} />
        <Box sx={{ flexGrow: 1 }} />
        <MetaChip label="dur" value={formatMs(durationOf(obs))} />
        {model && <MetaChip label="model" value={model} />}
        {typeof tokens?.total_tokens === 'number' && <MetaChip label="tok" value={tokens.total_tokens} />}
      </Stack>

      {tokens && (typeof tokens.prompt_tokens === 'number' || typeof tokens.completion_tokens === 'number') && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontFamily: MONO, fontSize: '0.62rem' }}>
          prompt {tokens.prompt_tokens ?? 0} · completion {tokens.completion_tokens ?? 0} · total {tokens.total_tokens ?? 0}
        </Typography>
      )}

      {input?.prompt && (
        <Box sx={{ mb: 1 }}>
          <SectionLabel action={<CopyButton text={input.prompt} />}>Prompt</SectionLabel>
          <CodeBlock maxHeight={180}>{input.prompt}</CodeBlock>
        </Box>
      )}

      <SectionLabel>Output</SectionLabel>
      {typeof output?.passed === 'boolean' ? (
        <Stack spacing={0.75}>
          <PassFailChip passed={output.passed} label={output.passed ? 'PASS' : 'FAIL'} />
          {output.rationale && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{output.rationale}</Typography>
          )}
        </Stack>
      ) : output?.answer ? (
        <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>{output.answer}</Typography>
      ) : (
        <CodeBlock maxHeight={180}>{asText(obs.output)}</CodeBlock>
      )}
    </Paper>
  );
};

/* ---------- main view ---------- */

export default function WorkflowTraceView() {
  const theme = useTheme();
  const { data, loading, error } = useAppSelector((s: RootState) => s.observability.trace);
  const [tab, setTab] = useState('overview');
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const observations = useMemo(() => data?.observations ?? [], [data]);

  const generations = useMemo(() => observations.filter(o => (o.type ?? '').toUpperCase() === 'GENERATION'), [observations]);
  const judges = useMemo(() => generations.filter(isJudge), [generations]);
  const calls = useMemo(() => generations.filter(o => !isJudge(o)), [generations]);
  const promptObs = useMemo(() => generations.filter(o => (o.input as GenInput)?.prompt), [generations]);

  const defaultSpanId = calls[0]?.id ?? observations[0]?.id ?? null;

  useEffect(() => {
    setSelectedSpanId(calls[0]?.id ?? observations[0]?.id ?? null);
  }, [data?.id, calls, observations]);

  if (loading) {
    return (
      <Loader />
    );
  }

  if (error) {
    return <InfoMessage message="Failed to load this trace." type="error" fullHeight />;
  }

  if (!data) {
    return (
      <InfoMessage
        message="Select a trace to inspect its spans, evaluation and prompts."
        type="info"
        icon={<TouchAppRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  const input = data.input as TraceInput;
  const output = data.output as TraceOutput;
  const question = typeof input?.question === 'string' ? input.question : data.name;
  const answer = typeof output?.answer === 'string' ? output.answer : asText(data.output);
  const configEntries = Object.entries(input ?? {}).filter(([k]) => k !== 'question');
  const headerModel = calls.map(modelOf).find(Boolean);

  const obsTimes = observations
    .flatMap(o => [Date.parse(o.startTime), Date.parse(o.endTime)])
    .filter(n => !Number.isNaN(n));
  const durationMs = obsTimes.length ? Math.max(...obsTimes) - Math.min(...obsTimes) : (data.latency ?? 0) * 1000;
  const totalTokens = generations.reduce((sum, o) => sum + (tokensOf(o) ?? 0), 0);
  const judgesPassed = judges.filter(o => (o.output as GenOutput)?.passed === true).length;

  const checks = data.scores.filter(s => s.value === 0 || s.value === 1);
  const metrics = data.scores.filter(s => s.value !== 0 && s.value !== 1);
  const checksPassed = checks.filter(s => s.value === 1).length;
  const passRate = typeof output?.judge_pass_rate === 'number'
    ? output.judge_pass_rate
    : judges.length ? judgesPassed / judges.length : null;

  const selectedObs = observations.find(o => o.id === (selectedSpanId ?? defaultSpanId));

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'timeline', label: `Timeline (${observations.length})` },
    { value: 'eval', label: `Eval (${judges.length + data.scores.length})` },
    { value: 'prompts', label: `Prompts (${promptObs.length})` },
  ];

  return (
    <Stack spacing={1.5}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{ p: 1.5, borderRadius: 2, background: theme.palette.customSurface.cardHeader, border: `1px solid ${theme.palette.divider}` }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box
            sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: alpha(theme.palette.primary.main, 0.12), flexShrink: 0, mt: 0.25 }}
          >
            <SmartToyRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{question}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO, fontSize: '0.6rem' }}>{data.id}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}>
              {headerModel && <MetaChip label="model" value={headerModel} />}
              {configEntries.map(([k, v]) => (
                <MetaChip key={k} label={k} value={String(v)} />
              ))}
              {data.tags?.map(t => <Chip key={t} size="small" label={t} variant="outlined" sx={{ height: 20, fontSize: '0.62rem' }} />)}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* KPI tiles */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <StatTile icon={<TimerOutlinedIcon sx={{ fontSize: 15 }} />} label="Duration" value={formatMs(durationMs)} />
        <StatTile icon={<TokenRoundedIcon sx={{ fontSize: 15 }} />} label="Tokens" value={totalTokens ? totalTokens.toLocaleString() : '—'} />
        <StatTile icon={<PaymentsRoundedIcon sx={{ fontSize: 15 }} />} label="Cost" value={`$${(data.totalCost ?? 0).toFixed(4)}`} />
        <StatTile
          icon={<GavelRoundedIcon sx={{ fontSize: 15 }} />}
          label="Judges"
          value={judges.length ? `${judgesPassed}/${judges.length}` : '—'}
          tone={judges.length && judgesPassed === judges.length ? 'success' : judges.length ? 'warning' : 'default'}
        />
        <StatTile
          icon={<RuleRoundedIcon sx={{ fontSize: 15 }} />}
          label="Checks"
          value={checks.length ? `${checksPassed}/${checks.length}` : '—'}
          tone={checks.length && checksPassed === checks.length ? 'success' : checks.length ? 'warning' : 'default'}
        />
      </Stack>

      {/* Sub-tabs */}
      <SegmentedToggle fullWidth size="small" value={tab} onChange={setTab} options={tabs} aria-label="trace section" />

      {/* Overview */}
      {tab === 'overview' && (
        <Stack spacing={1.5}>
          <ResponsiveCardTable title="Question & Answer" showSettings={false} showFullScreenButton={false}>
            <SectionLabel>Question</SectionLabel>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{question}</Typography>
            <SectionLabel action={<CopyButton text={answer} />}>Answer</SectionLabel>
            <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>{answer}</Typography>
          </ResponsiveCardTable>

          {passRate !== null && (
            <ResponsiveCardTable title="Judge verdicts" showSettings={false} showFullScreenButton={false}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="caption" sx={{ fontFamily: MONO, fontWeight: 700, color: passRate === 1 ? theme.palette.success.main : theme.palette.warning.main }}>
                  {Math.round(passRate * 100)}% pass
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                {judges.map(j => {
                  const o = j.output as GenOutput;

                  return (
                    <PassFailChip key={j.id} passed={o?.passed === true} label={prettyName(j.name)} tooltip={o?.rationale} />
                  );
                })}
                {judges.length === 0 && (
                  <Typography variant="caption" color="text.secondary">No judges recorded.</Typography>
                )}
              </Stack>
            </ResponsiveCardTable>
          )}
        </Stack>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <Stack spacing={1.25}>
          <ResponsiveCardTable title="Observation Waterfall" showSettings={false} showFullScreenButton={false}>
            <ObservationWaterfall
              observations={observations}
              selectedId={selectedSpanId ?? defaultSpanId}
              onSelect={setSelectedSpanId}
            />
          </ResponsiveCardTable>
          {selectedObs && <SpanDetail obs={selectedObs} />}
        </Stack>
      )}

      {/* Evaluation */}
      {tab === 'eval' && (
        <Stack spacing={1.5}>
          {judges.length > 0 && (
            <ResponsiveCardTable title="Judges" showSettings={false} showFullScreenButton={false}>
              <Stack spacing={0.75}>
                {judges.map(j => {
                  const o = j.output as GenOutput;
                  const passed = o?.passed === true;

                  return (
                    <Paper key={j.id} variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: o?.rationale ? 0.5 : 0 }}>
                        <PassFailChip passed={passed} label={prettyName(j.name)} />
                        <Box sx={{ flexGrow: 1 }} />
                        {typeof tokensOf(j) === 'number' && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO, fontSize: '0.6rem' }}>
                            {tokensOf(j)} tok
                          </Typography>
                        )}
                      </Stack>
                      {o?.rationale && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{o.rationale}</Typography>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </ResponsiveCardTable>
          )}

          {checks.length > 0 && (
            <ResponsiveCardTable title="Checks" showSettings={false} showFullScreenButton={false}>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                {checks.map(s => (
                  <PassFailChip key={s.id} passed={s.value === 1} label={prettyName(s.name)} tooltip={s.comment} />
                ))}
              </Stack>
            </ResponsiveCardTable>
          )}

          {metrics.length > 0 && (
            <ResponsiveCardTable title="Metrics" showSettings={false} showFullScreenButton={false}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 0.75 }}>
                {metrics.map(s => <MetricCard key={s.id} score={s} />)}
              </Box>
            </ResponsiveCardTable>
          )}

          {judges.length === 0 && data.scores.length === 0 && (
            <Typography variant="caption" color="text.secondary">No evaluation data for this trace.</Typography>
          )}
        </Stack>
      )}

      {/* Prompts */}
      {tab === 'prompts' && (
        <ResponsiveCardTable title={`Prompts (${promptObs.length})`} showSettings={false} showFullScreenButton={false}>
          <Stack spacing={0.75}>
            {promptObs.map((o, i) => {
              const prompt = (o.input as GenInput).prompt ?? '';

              return (
                <Collapsible
                  key={o.id}
                  title={o.name}
                  defaultOpen={i === 0}
                  meta={modelOf(o) ? <Chip size="small" label={modelOf(o)} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} /> : undefined}
                  action={<CopyButton text={prompt} />}
                >
                  <CodeBlock maxHeight={260}>{prompt}</CodeBlock>
                </Collapsible>
              );
            })}
            {promptObs.length === 0 && (
              <Typography variant="caption" color="text.secondary">No prompts captured for this trace.</Typography>
            )}
          </Stack>
        </ResponsiveCardTable>
      )}
    </Stack>
  );
}

const MetricCard = ({ score }: { score: Score }) => (
  <Tooltip title={score.comment || ''} arrow>
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {prettyName(score.name)}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontFamily: MONO, fontSize: '0.95rem' }}>
        {Number.isInteger(score.value) ? score.value : score.value.toFixed(2)}
      </Typography>
    </Paper>
  </Tooltip>
);
