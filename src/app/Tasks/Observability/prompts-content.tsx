import { Box, Chip, Stack } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import type { GenInput } from '../../../shared/models/observability/agentic-conventions';
import {
  asText,
  modelOf,
  tokensOf,
} from '../../../shared/models/observability/agentic-conventions';
import {
  CodeBlock,
  Collapsible,
  CopyButton,
  MetaChip,
} from './trace-ui';
import InfoMessage from '../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

type PromptsContentProps = {
  promptObs: Observation[];
  /** Currently selected span in the trace tree, if any — its prompt opens expanded. */
  activeObservationId?: string | null;
};

const PromptsContent = ({ promptObs, activeObservationId }: PromptsContentProps) => {
  if (promptObs.length === 0) {
    return (
      <InfoMessage
        message="No prompts captured for this trace."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  return (
    <Stack spacing={0.75} height="100%">
      {promptObs.map((observation, index) => {
        const input = observation.input as GenInput | null | undefined;
        const prompt = asText(input?.prompt);
        const model = modelOf(observation);
        const tokens = tokensOf(observation);
        const isActive = observation.id === activeObservationId;

        return (
          <Box
            key={observation.id}
            sx={isActive ? { borderRadius: 1.5, boxShadow: theme => `0 0 0 1.5px ${theme.palette.primary.main}` } : undefined}
          >
            <Collapsible
              key={isActive ? `${observation.id}-active` : observation.id}
              title={observation.name}
              defaultOpen={activeObservationId ? isActive : index === 0}
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
          </Box>
        );
      })}
    </Stack>
  );
};

export default PromptsContent;
