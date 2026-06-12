import { Chip, Stack, Typography } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import type { GenInput } from '../../../shared/models/observability/agentic-conventions';
import { modelOf, tokensOf } from '../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import { CodeBlock, Collapsible, CopyButton, MetaChip } from './trace-ui';

type PromptsTabProps = {
  promptObs: Observation[];
};

const PromptsTab = ({ promptObs }: PromptsTabProps) => {
  const models = Array.from(new Set(promptObs.map(modelOf).filter(Boolean)));
  const details = models.length
    ? `${promptObs.length} prompt${promptObs.length === 1 ? '' : 's'} · ${models.join(', ')}`
    : undefined;

  return (
    <ResponsiveCardTable
      title={`Prompts (${promptObs.length})`}
      details={details}
      showSettings={false}
      showFullScreenButton={false}
    >
      <Stack spacing={0.75}>
        {promptObs.map((observation, index) => {
          const prompt = (observation.input as GenInput).prompt ?? '';
          const model = modelOf(observation);
          const tokens = tokensOf(observation);

          return (
            <Collapsible
              key={observation.id}
              title={observation.name}
              defaultOpen={index === 0}
              meta={
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  {model && <Chip size="small" label={model} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                  <MetaChip label="chars" value={prompt.length.toLocaleString()} />
                  {typeof tokens === 'number' && <MetaChip label="tokens" value={tokens} />}
                </Stack>
              }
              action={<CopyButton text={prompt} />}
            >
              <CodeBlock maxHeight={260}>{prompt}</CodeBlock>
            </Collapsible>
          );
        })}

        {promptObs.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No prompts captured for this trace.
          </Typography>
        )}
      </Stack>
    </ResponsiveCardTable>
  );
};

export default PromptsTab;
