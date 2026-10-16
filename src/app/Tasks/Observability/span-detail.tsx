import { Box, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import type { Score } from '../../../shared/models/observability/score';
import {
  asText,
  durationOf,
  formatMs,
  isFailedJudge,
  modelOf,
} from '../../../shared/models/observability/agentic-conventions';
import type { GenInput, GenOutput } from '../../../shared/models/observability/agentic-conventions';
import { colorForType } from './trace-observation-waterfall';
import { CodeBlock, CopyButton, MetaChip, PassFailChip, SectionLabel } from './trace-ui';
import CounterfactualReplayPanel from './counterfactual-replay-panel';
import AnnotateForm from './annotate-form';
import type { AnnotationSavePayload } from './annotate-form';
import JsonTree from './json-tree';

const renderValue = (value: unknown, maxHeight = 180) =>
  value && typeof value === 'object'
    ? <JsonTree data={value} maxHeight={maxHeight} />
    : <CodeBlock maxHeight={maxHeight}>{asText(value)}</CodeBlock>;

const omitPrompt = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const rest: Record<string, unknown> = {};

  Object.keys(value).forEach((key) => {
    if (key !== 'prompt') {
      rest[key] = (value as Record<string, unknown>)[key];
    }
  });

  return Object.keys(rest).length > 0 ? rest : undefined;
};

interface SpanDetailProps {
  obs: Observation
  scores?: Score[]
  onAnnotate?: (payload: AnnotationSavePayload) => void
  savingAnnotation?: boolean
}

const SpanDetail = ({ obs, scores = [], onAnnotate, savingAnnotation = false }: SpanDetailProps) => {
  const theme = useTheme();
  const input = obs.input as GenInput;
  const output = obs.output as GenOutput;
  const model = modelOf(obs);
  const tokens = output?.tokens;
  // A FAIL verdict colors the whole card red, so it doesn't read as a healthy generation.
  const color = isFailedJudge(obs) ? theme.palette.error.main : colorForType(obs.type);
  const promptText = asText(input?.prompt);
  const inputWithoutPrompt = omitPrompt(obs.input);

  return (
    // The pane title already names the span, so this is just its type and vitals,
    // then Input over Output at full width (the Langfuse/LangSmith reading order).
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip size="small" label={obs.type} sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha(color, 0.12), color }} />
        <MetaChip label="duration" value={formatMs(durationOf(obs))} />
        {model && <MetaChip label="model" value={model} />}
        {typeof tokens?.total_tokens === 'number' && (
          <MetaChip
            label="tokens"
            value={typeof tokens.prompt_tokens === 'number' || typeof tokens.completion_tokens === 'number'
              ? `${tokens.total_tokens} (${tokens.prompt_tokens ?? 0} → ${tokens.completion_tokens ?? 0})`
              : tokens.total_tokens}
          />
        )}
      </Stack>

      <Stack spacing={2}>
        <Box>
          <SectionLabel>Input</SectionLabel>

          {promptText && (
            <Box sx={{ mb: 1 }}>
              <SectionLabel action={<CopyButton text={promptText} />}>Prompt</SectionLabel>
              <CodeBlock maxHeight={360}>{promptText}</CodeBlock>
            </Box>
          )}

          {inputWithoutPrompt && (
            <Box sx={{ mb: 1 }}>
              {renderValue(inputWithoutPrompt)}
            </Box>
          )}

          {!input?.prompt && !inputWithoutPrompt && renderValue(obs.input)}
        </Box>

        <Box>
          <SectionLabel>Output</SectionLabel>

          {typeof output?.passed === 'boolean' ? (
            <Stack spacing={0.75}>
              <PassFailChip passed={output.passed} label={output.passed ? 'PASS' : 'FAIL'} />
              {output.rationale && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {output.rationale}
                </Typography>
              )}
            </Stack>
          ) : output?.answer ? (
            <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
              {output.answer}
            </Typography>
          ) : renderValue(obs.output)}
        </Box>
      </Stack>

      {onAnnotate && (
        <AnnotateForm scores={scores} targetLabel="step" onSave={onAnnotate} saving={savingAnnotation} />
      )}

      {model && input?.prompt && (
        <CounterfactualReplayPanel traceId={obs.traceId} observationId={obs.id} prompt={input.prompt} />
      )}
    </Stack>
  );
};

export default SpanDetail;
