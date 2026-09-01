import { useEffect, useMemo, useState } from 'react';
import { Box, Collapse, IconButton, Paper, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import type { Observation } from '../../../shared/models/observability/observation';
import type { Score } from '../../../shared/models/observability/score';
import type { GenOutput } from '../../../shared/models/observability/agentic-conventions';
import { prettyName, tokensOf } from '../../../shared/models/observability/agentic-conventions';
import { SectionLabel } from './trace-ui';
import InfoMessage from '../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnnotateForm from './annotate-form';
import type { AnnotationSavePayload } from './annotate-form';
import { TONE_COLOR, scoreTone, worstTone } from './score-dimensions';

type EvaluationContentProps = {
  judges: Observation[];
  checks: Score[];
  metrics: Score[];
  humanScores: Score[];
  onAnnotateTrace: (payload: AnnotationSavePayload) => void;
  savingAnnotation: boolean;
  /** Jump to the span an assessment was produced for/against (judge call or scored observation). */
  onJumpToSpan?: (observationId: string) => void;
};

/** Normalized assessment so judges, checks and metrics share one selection model. */
type Assessment = {
  key: string;
  group: 'judge' | 'check' | 'metric';
  name: string;
  passed?: boolean;
  value?: number;
  detail?: string;
  tokens?: number;
  /** Span this assessment links to: the judge's own call, or a check/metric's scored observation. */
  observationId?: string;
};

const EvaluationContent = ({ judges, checks, metrics, humanScores, onAnnotateTrace, savingAnnotation, onJumpToSpan }: EvaluationContentProps) => {
  const judgeItems = useMemo<Assessment[]>(
    () =>
      judges.map(judge => {
        const output = judge.output as GenOutput;
        return {
          key: judge.id,
          group: 'judge',
          name: prettyName(judge.name),
          passed: output?.passed === true,
          detail: output?.rationale,
          tokens: tokensOf(judge),
          observationId: judge.id,
        };
      }),
    [judges],
  );

  const checkItems = useMemo<Assessment[]>(
    () =>
      checks.map(score => ({
        key: score.id,
        group: 'check',
        name: prettyName(score.name),
        passed: score.value === 1,
        detail: score.comment,
        observationId: score.observationId || undefined,
      })),
    [checks],
  );

  const metricItems = useMemo<Assessment[]>(
    () =>
      metrics.map(score => ({
        key: score.id,
        group: 'metric',
        name: prettyName(score.name),
        value: score.value ?? undefined,
        detail: score.comment,
        observationId: score.observationId || undefined,
      })),
    [metrics],
  );

  const boolItems = useMemo(() => [...judgeItems, ...checkItems], [judgeItems, checkItems]);
  const allItems = useMemo(() => [...boolItems, ...metricItems], [boolItems, metricItems]);

  const passed = boolItems.filter(item => item.passed).length;
  const passRate = boolItems.length ? passed / boolItems.length : null;

  // Numeric range so metric cells can read as a heat gradient.
  const metricRange = useMemo(() => {
    const values = metricItems.map(item => item.value ?? 0);
    return { min: Math.min(...values, 0), max: Math.max(...values, 1) };
  }, [metricItems]);

  // Surface what matters first: open on the first failing check, else the first assessment.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  useEffect(() => {
    const firstFail = boolItems.find(item => item.passed === false);
    setSelectedKey(firstFail?.key ?? allItems[0]?.key ?? null);
  }, [boolItems, allItems]);

  const selected = allItems.find(item => item.key === selectedKey);

  const onSelect = (key: string) => setSelectedKey(prev => (prev === key ? null : key));

  if (allItems.length === 0 && humanScores.length === 0) {
    return (
      <InfoMessage
        message="No evaluation data for this trace."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  return (
    <Stack spacing={1.5}>
      {(() => {
        const tone = worstTone(humanScores.map(scoreTone));
        const toneColor = TONE_COLOR[tone];

        return (
          <Section
            icon={tone === 'bad'
              ? <FlagRoundedIcon sx={{ fontSize: 15, color: toneColor }} />
              : <RateReviewRoundedIcon sx={{ fontSize: 15, color: humanScores.length ? toneColor : undefined }} />}
            title="Human Annotations"
            count={humanScores.length}
          >
            <AnnotateForm scores={humanScores} targetLabel="trace" onSave={onAnnotateTrace} saving={savingAnnotation} />
          </Section>
        );
      })()}

      {passRate !== null && (
        <PassRateBar passRate={passRate} passed={passed} total={boolItems.length} />
      )}

      {judgeItems.length > 0 && (
        <Section icon={<GavelRoundedIcon sx={{ fontSize: 15 }} />} title="Judges" count={judgeItems.length}>
          <HeatGrid>
            {judgeItems.map(item => (
              <BoolCell key={item.key} item={item} selected={item.key === selectedKey} onSelect={onSelect} onJumpToSpan={onJumpToSpan} />
            ))}
          </HeatGrid>
        </Section>
      )}

      {checkItems.length > 0 && (
        <Section icon={<RuleRoundedIcon sx={{ fontSize: 15 }} />} title="Checks" count={checkItems.length}>
          <HeatGrid>
            {checkItems.map(item => (
              <BoolCell key={item.key} item={item} selected={item.key === selectedKey} onSelect={onSelect} onJumpToSpan={onJumpToSpan} />
            ))}
          </HeatGrid>
        </Section>
      )}

      {metricItems.length > 0 && (
        <Section icon={<QueryStatsRoundedIcon sx={{ fontSize: 15 }} />} title="Metrics" count={metricItems.length}>
          <HeatGrid minCell={130}>
            {metricItems.map(item => (
              <MetricCell
                key={item.key}
                item={item}
                range={metricRange}
                selected={item.key === selectedKey}
                onSelect={onSelect}
                onJumpToSpan={onJumpToSpan}
              />
            ))}
          </HeatGrid>
        </Section>
      )}

      <RationalePanel selected={selected} onJumpToSpan={onJumpToSpan} />
    </Stack>
  );
};

const PassRateBar = ({ passRate, passed, total }: { passRate: number; passed: number; total: number }) => {
  const theme = useTheme();
  const allPass = passRate === 1;
  const color = allPass ? theme.palette.success.main : passRate === 0 ? theme.palette.error.main : theme.palette.warning.main;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
      <Stack direction="row" alignItems="baseline" sx={{ mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
          Pass rate
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color }}>
          {Math.round(passRate * 100)}%
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.75 }}>
          {passed}/{total} passed
        </Typography>
      </Stack>
      <Box sx={{ height: 8, borderRadius: 999, bgcolor: alpha(theme.palette.error.main, 0.18), overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${passRate * 100}%`,
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${alpha(color, 0.7)}, ${color})`,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Paper>
  );
};

const Section = ({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) => (
  <Box>
    <SectionLabel>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, verticalAlign: 'middle' }}>
        {icon}
        {title}
        <Box component="span" sx={{ opacity: 0.6 }}>· {count}</Box>
      </Box>
    </SectionLabel>
    {children}
  </Box>
);

const HeatGrid = ({ children, minCell = 120 }: { children: React.ReactNode; minCell?: number }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCell}px, 1fr))`, gap: 0.75 }}>
    {children}
  </Box>
);

const cellSx = (color: string, selected: boolean) => ({
  position: 'relative' as const,
  minWidth: 0,
  overflow: 'hidden',
  p: 1,
  borderRadius: 1.5,
  cursor: 'pointer',
  bgcolor: alpha(color, 0.12),
  border: selected ? `2px solid ${color}` : `1px solid ${alpha(color, 0.3)}`,
  // Keep height stable whether the border is 1px or 2px.
  m: selected ? 0 : '1px',
  transition: 'transform 0.12s ease, background-color 0.12s ease',
  '&:hover': { transform: 'translateY(-1px)', bgcolor: alpha(color, 0.18) },
});

const JumpButton = ({ observationId, onJumpToSpan }: { observationId?: string; onJumpToSpan?: (id: string) => void }) => {
  if (!observationId || !onJumpToSpan) return null;

  return (
    <Tooltip title="View span" arrow disableInteractive>
      <IconButton
        size="small"
        onClick={event => {
          event.stopPropagation();
          onJumpToSpan(observationId);
        }}
        sx={{ p: 0.25, ml: 0.25 }}
      >
        <LaunchRoundedIcon sx={{ fontSize: 12 }} />
      </IconButton>
    </Tooltip>
  );
};

const BoolCell = ({
  item,
  selected,
  onSelect,
  onJumpToSpan,
}: {
  item: Assessment;
  selected: boolean;
  onSelect: (key: string) => void;
  onJumpToSpan?: (id: string) => void;
}) => {
  const theme = useTheme();
  const pass = item.passed === true;
  const color = pass ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Tooltip title={item.detail || ''} arrow disableInteractive placement="top">
      <Box onClick={() => onSelect(item.key)} sx={cellSx(color, selected)}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              bgcolor: color,
              color: theme.palette.getContrastText(color),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {pass ? <CheckRoundedIcon sx={{ fontSize: 13 }} /> : <CloseRoundedIcon sx={{ fontSize: 13 }} />}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {typeof item.tokens === 'number' && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.55rem' }}>
              {item.tokens}t
            </Typography>
          )}
          <JumpButton observationId={item.observationId} onJumpToSpan={onJumpToSpan} />
        </Stack>
        <Typography
          variant="statLabel"
          sx={{
            mt: 0.5,
            color,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </Typography>
      </Box>
    </Tooltip>
  );
};

const MetricCell = ({
  item,
  range,
  selected,
  onSelect,
  onJumpToSpan,
}: {
  item: Assessment;
  range: { min: number; max: number };
  selected: boolean;
  onSelect: (key: string) => void;
  onJumpToSpan?: (id: string) => void;
}) => {
  const theme = useTheme();
  const color = theme.palette.primary.main;
  const value = item.value ?? 0;
  const t = (value - range.min) / Math.max(1, range.max - range.min);

  return (
    <Tooltip title={item.detail || ''} arrow disableInteractive placement="top">
      <Box
        onClick={() => onSelect(item.key)}
        sx={{
          position: 'relative',
          p: 1,
          borderRadius: 1.5,
          cursor: 'pointer',
          bgcolor: alpha(color, 0.1 + t * 0.45),
          border: selected ? `2px solid ${color}` : `1px solid ${alpha(color, 0.3)}`,
          m: selected ? 0 : '1px',
          transition: 'transform 0.12s ease',
          '&:hover': { transform: 'translateY(-1px)' },
        }}
      >
        <Stack direction="row" alignItems="baseline">
          <Typography variant="statValue" sx={{ color: theme.palette.text.primary }}>
            {Number.isInteger(value) ? value : value.toFixed(2)}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <JumpButton observationId={item.observationId} onJumpToSpan={onJumpToSpan} />
        </Stack>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.6rem',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </Typography>
      </Box>
    </Tooltip>
  );
};

const RationalePanel = ({ selected, onJumpToSpan }: { selected: Assessment | undefined; onJumpToSpan?: (id: string) => void }) => {
  const theme = useTheme();

  const color = !selected
    ? theme.palette.divider
    : selected.group === 'metric'
      ? theme.palette.primary.main
      : selected.passed
        ? theme.palette.success.main
        : theme.palette.error.main;

  const verdict = !selected
    ? ''
    : selected.group === 'metric'
      ? (Number.isInteger(selected.value ?? 0) ? String(selected.value) : (selected.value ?? 0).toFixed(2))
      : selected.passed
        ? 'PASS'
        : 'FAIL';

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderLeft: `3px solid ${color}`, p: 1.25, minHeight: 64 }}>
      <SectionLabel>Rationale</SectionLabel>
      <Collapse in={Boolean(selected)} unmountOnExit>
        {selected && (
          <>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{selected.name}</Typography>
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: 999,
                  bgcolor: alpha(color, 0.14),
                  color,
                  fontWeight: 700,
                  fontSize: '0.62rem',
                }}
              >
                {verdict}
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              {selected.observationId && onJumpToSpan && (
                <Box
                  onClick={() => onJumpToSpan(selected.observationId!)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    cursor: 'pointer',
                    color: 'primary.main',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  <LaunchRoundedIcon sx={{ fontSize: 13 }} />
                  View span
                </Box>
              )}
            </Stack>
            <Typography variant="bodySm" sx={{ color: 'text.secondary' }}>
              {selected.detail || 'No rationale recorded for this assessment.'}
            </Typography>
          </>
        )}
      </Collapse>
      {!selected && (
        <Typography variant="bodySm" color="text.secondary">
          Select a cell above to read its rationale.
        </Typography>
      )}
    </Paper>
  );
};

export default EvaluationContent;
