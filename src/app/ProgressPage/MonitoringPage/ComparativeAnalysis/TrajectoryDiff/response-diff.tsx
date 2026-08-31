import { Box, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import type { GenOutput, TraceOutput } from '../../../../../shared/models/observability/agentic-conventions';
import { MONO, isGeneration, isJudge, prettyName, tokensOf } from '../../../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';

type Props = {
  byRun: Record<string, TraceDetail>;
  runIds: string[];
  runNameById: Record<string, string>;
  colorById: Record<string, string>;
  baselineId: string;
};

/**
 * Some judge-only pipelines never log the explanation being judged as its
 * own generation — it only appears embedded in the judge's own prompt, as a
 * "Justification: ..." line (see the ilora_eval judge template). This is a
 * last-resort scrape of that one convention, so it's only ever reached once
 * every proper `answer`/`raw_output` field below has already come up empty.
 */
const justificationFromJudgePrompt = (promptText: string): string | null => {
  const match = promptText.match(/Justification:\s*([^\n]+)/i);

  return match ? match[1].trim() : null;
};

type ResponseText = { text: string; extracted: boolean };

/**
 * The actual generated text for a trace — prefer the trace-level output
 * (some pipelines log the final answer there), otherwise fall back to the
 * first non-judge generation's output. Different LLM pipelines shape this
 * differently, so this tries the common conventions rather than one field.
 */
const responseTextOf = (t: TraceDetail): ResponseText | null => {
  const traceAnswer = (t.output as TraceOutput | null)?.answer;

  if (typeof traceAnswer === 'string' && traceAnswer.trim()) return { text: traceAnswer, extracted: false };

  const call = t.observations.find(o => isGeneration(o) && !isJudge(o));
  const out = call?.output as GenOutput | undefined;

  if (typeof out?.answer === 'string' && out.answer.trim()) return { text: out.answer, extracted: false };

  const raw = out?.raw_output;

  if (typeof raw === 'string' && raw.trim()) return { text: raw, extracted: false };

  const judge = t.observations.find(isJudge);
  const judgeInput = judge?.input;

  if (typeof judgeInput === 'string') {
    const extracted = justificationFromJudgePrompt(judgeInput);

    if (extracted) return { text: extracted, extracted: true };
  }

  return null;
};

const judgeVerdictOf = (t: TraceDetail): { passed: boolean; rationale?: string; name: string } | null => {
  const judge = t.observations.find(isJudge);

  if (!judge) return null;
  const out = judge.output as GenOutput | undefined;

  if (typeof out?.passed !== 'boolean') return null;

  return { passed: out.passed, rationale: out.rationale, name: prettyName(judge.name) };
};

const tokensOfTrace = (t: TraceDetail): number =>
  t.observations.reduce((sum, o) => sum + (tokensOf(o) ?? 0), 0);

export default function ResponseDiff({ byRun, runIds, runNameById, colorById, baselineId }: Props) {
  const theme = useTheme();

  const baselineScores = new Map((byRun[baselineId]?.scores ?? []).map(s => [s.name, s.value]));

  return (
    <ResponsiveCardTable
      title="Response diff"
      details="the actual generated answer, per run, for this question"
      showSettings={false}
      showFullScreenButton={false}
    >
      <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 0.5 }}>
        {runIds.map(id => {
          const trace = byRun[id];
          const response = trace ? responseTextOf(trace) : null;
          const verdict = trace ? judgeVerdictOf(trace) : null;
          const scores = trace?.scores ?? [];

          return (
            <Box
              key={id}
              sx={{
                flex: '0 0 auto',
                width: 340,
                border: `1px solid ${theme.palette.divider}`,
                borderLeft: `3px solid ${colorById[id]}`,
                borderRadius: 1.5,
                p: 1.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorById[id], flexShrink: 0 }} />
                <Typography
                  component="span"
                  sx={{ fontFamily: MONO, fontSize: '0.68rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={runNameById[id] ?? id}
                >
                  {runNameById[id] ?? id}
                </Typography>
                {id === baselineId && <Chip label="base" size="small" sx={{ height: 16, fontSize: '0.55rem' }} />}
                <Box sx={{ flexGrow: 1 }} />
                {verdict && (
                  <Chip
                    label={verdict.passed ? 'PASS' : 'FAIL'}
                    size="small"
                    color={verdict.passed ? 'success' : 'error'}
                    sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700 }}
                  />
                )}
              </Stack>

              <Box
                sx={{
                  bgcolor: theme.palette.action.hover,
                  borderRadius: 1,
                  p: 1,
                  minHeight: 120,
                  maxHeight: 260,
                  overflow: 'auto',
                }}
              >
                {trace ? (
                  response ? (
                    <>
                      {response.extracted && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'text.disabled', fontStyle: 'italic', mb: 0.5 }}
                        >
                          extracted from judge prompt — not logged directly
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.76rem' }}>
                        {response.text}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No response text logged for this trace.
                    </Typography>
                  )
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Not present in this run.
                  </Typography>
                )}
              </Box>

              {scores.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {scores.map(sc => {
                    const baseValue = baselineScores.get(sc.name);
                    const delta = id !== baselineId && baseValue !== undefined ? sc.value - baseValue : 0;
                    const tone =
                      delta > 0 ? theme.palette.success.main : delta < 0 ? theme.palette.error.main : theme.palette.text.secondary;

                    return (
                      <Chip
                        key={sc.name}
                        size="small"
                        label={`${prettyName(sc.name)}: ${sc.value}${delta !== 0 ? (delta > 0 ? ` (+${delta.toFixed(1)})` : ` (${delta.toFixed(1)})`) : ''}`}
                        sx={{
                          height: 20,
                          fontSize: '0.6rem',
                          bgcolor: delta !== 0 ? alpha(tone, 0.12) : undefined,
                          color: delta !== 0 ? tone : undefined,
                        }}
                      />
                    );
                  })}
                </Stack>
              )}

              {verdict?.rationale && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {verdict.rationale}
                </Typography>
              )}

              {trace && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: MONO, fontSize: '0.62rem' }}>
                  {tokensOfTrace(trace).toLocaleString()} tokens
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </ResponsiveCardTable>
  );
}
