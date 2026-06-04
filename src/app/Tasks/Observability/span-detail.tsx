import { Box, Chip, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import {
  asText,
  durationOf,
  formatMs,
  modelOf,
} from '../../../shared/models/observability/agentic-conventions';
import type { GenInput, GenOutput } from '../../../shared/models/observability/agentic-conventions';
import { colorForType } from './trace-observation-waterfall';
import { CodeBlock, CopyButton, MetaChip, PassFailChip, SectionLabel } from './trace-ui';

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
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'inherit' }}>
          {obs.name}
        </Typography>
        <Chip size="small" label={obs.type} sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(color, 0.12), color }} />
        <Box sx={{ flexGrow: 1 }} />
        <MetaChip label="dur" value={formatMs(durationOf(obs))} />
        {model && <MetaChip label="model" value={model} />}
        {typeof tokens?.total_tokens === 'number' && <MetaChip label="tok" value={tokens.total_tokens} />}
      </Stack>

      {tokens && (typeof tokens.prompt_tokens === 'number' || typeof tokens.completion_tokens === 'number') && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontFamily: 'monospace', fontSize: '0.62rem' }}>
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
          {output.rationale && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{output.rationale}</Typography>}
        </Stack>
      ) : output?.answer ? (
        <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>{output.answer}</Typography>
      ) : (
        <CodeBlock maxHeight={180}>{asText(obs.output)}</CodeBlock>
      )}
    </Paper>
  );
};

export default SpanDetail;
