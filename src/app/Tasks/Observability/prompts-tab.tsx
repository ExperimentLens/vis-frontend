import { Chip, Stack, Typography } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import type { GenInput } from '../../../shared/models/observability/agentic-conventions';
import { modelOf } from '../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import { CodeBlock, Collapsible, CopyButton } from './trace-ui';

type PromptsTabProps = {
  promptObs: Observation[];
};

const PromptsTab = ({ promptObs }: PromptsTabProps) => (
  <ResponsiveCardTable title={`Prompts (${promptObs.length})`} showSettings={false} showFullScreenButton={false}>
    <Stack spacing={0.75}>
      {promptObs.map((observation, index) => {
        const prompt = (observation.input as GenInput).prompt ?? '';
        const model = modelOf(observation);

        return (
          <Collapsible
            key={observation.id}
            title={observation.name}
            defaultOpen={index === 0}
            meta={model ? <Chip size="small" label={model} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} /> : undefined}
            action={<CopyButton text={prompt} />}
          >
            <CodeBlock maxHeight={260}>{prompt}</CodeBlock>
          </Collapsible>
        );
      })}

      {promptObs.length === 0 && <Typography variant="caption" color="text.secondary">No prompts captured for this trace.</Typography>}
    </Stack>
  </ResponsiveCardTable>
);

export default PromptsTab;
